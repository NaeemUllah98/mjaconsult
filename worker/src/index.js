/**
 * MJACONSULT — "delete account" worker (Cloudflare Workers, free tier).
 *
 * A browser-only Firebase Spark app CANNOT delete another user's Auth login —
 * that requires privileged (Admin) credentials, which must never live in the
 * client. This tiny worker holds a Firebase **service account** as an encrypted
 * secret and does the privileged delete on the server side:
 *
 *   1. Verifies the caller's Firebase ID token (must be a signed-in admin).
 *   2. Deletes the target user from Firebase Authentication.
 *   3. Deletes the target user's Firestore docs (users/{uid}, doctors/{uid}).
 *
 * No `firebase-admin` npm package is used (it needs Node APIs that Workers lack)
 * — everything is done with the Google REST APIs + Web Crypto, which run natively
 * on the Workers runtime.
 *
 * Secrets/vars (set with `wrangler secret put` / in wrangler.toml [vars]):
 *   FIREBASE_SERVICE_ACCOUNT  (secret) full service-account JSON
 *   FIREBASE_API_KEY          (secret) Web API key — used only to verify tokens
 *   ADMIN_EMAIL               (var)    bootstrap admin email (fallback check)
 *   ALLOWED_ORIGIN            (var)    e.g. https://mjaconsult.com (CORS)
 */

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "method-not-allowed" }, 405, cors);
    }

    try {
      const { idToken, uid } = await request.json();
      if (!idToken || !uid) {
        return json({ error: "missing idToken or uid" }, 400, cors);
      }

      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      const projectId = sa.project_id;

      // 1) Verify the caller and learn who they are.
      const caller = await verifyIdToken(idToken, env.FIREBASE_API_KEY);
      const callerUid = caller.localId;

      // 2) Mint a privileged access token for the Google REST APIs.
      const accessToken = await getAccessToken(sa);

      // 3) Authorise: the caller must be an admin. We trust the Firestore
      //    `users/{callerUid}.role == "admin"`, or the bootstrap ADMIN_EMAIL.
      const callerDoc = await getFirestoreDoc(projectId, `users/${callerUid}`, accessToken);
      const callerRole = callerDoc?.fields?.role?.stringValue;
      const isAdmin =
        callerRole === "admin" ||
        (env.ADMIN_EMAIL && caller.email &&
          caller.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase());
      if (!isAdmin) {
        return json({ error: "forbidden — caller is not an admin" }, 403, cors);
      }

      // Safety: never let an admin delete their own login this way.
      if (uid === callerUid) {
        return json({ error: "refuse to delete your own account" }, 400, cors);
      }

      // 4) Delete the Auth login, then the Firestore docs.
      await deleteAuthUser(projectId, uid, accessToken);
      await deleteFirestoreDoc(projectId, `doctors/${uid}`, accessToken);
      await deleteFirestoreDoc(projectId, `users/${uid}`, accessToken);

      return json({ ok: true, uid }, 200, cors);
    } catch (err) {
      return json({ error: String(err?.message || err) }, 500, cors);
    }
  },
};

/* ------------------------------------------------------------------ helpers */

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/** Verify a Firebase ID token and return the account record (localId, email…). */
async function verifyIdToken(idToken, apiKey) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  const data = await res.json();
  if (!res.ok || !data.users || !data.users[0]) {
    throw new Error("invalid or expired sign-in token");
  }
  return data.users[0];
}

/** Exchange the service account for a short-lived Google OAuth access token. */
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(claim))}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlBytes(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" +
      encodeURIComponent(jwt),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("could not mint access token: " + JSON.stringify(data));
  }
  return data.access_token;
}

async function importPrivateKey(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getFirestoreDoc(projectId, path, accessToken) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("firestore read failed: " + res.status);
  return res.json();
}

async function deleteFirestoreDoc(projectId, path, accessToken) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`firestore delete failed (${path}): ${res.status}`);
  }
}

async function deleteAuthUser(projectId, uid, accessToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localIds: [uid], force: true }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error("auth delete failed: " + JSON.stringify(data));
  }
  // batchDelete reports per-account problems in `errors`; a missing account is
  // fine (already gone) — anything else is a real failure.
  if (Array.isArray(data.errors) && data.errors.length) {
    const real = data.errors.filter(
      (e) => !/NOT_FOUND|USER_NOT_FOUND/i.test(e.message || ""),
    );
    if (real.length) throw new Error("auth delete error: " + JSON.stringify(real));
  }
}

/* base64url utilities (Workers have btoa/atob but no Buffer) */
function b64urlBytes(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(str) {
  return b64urlBytes(new TextEncoder().encode(str));
}
