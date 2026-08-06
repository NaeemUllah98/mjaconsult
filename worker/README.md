# MJACONSULT — "Delete account" worker (free, on Cloudflare)

This tiny server lets the admin panel **truly delete a user from Firebase
Authentication** (not just Firestore). It runs on Cloudflare's free plan, so your
Firebase project stays on the free **Spark** plan and you pay nothing.

You only set this up **once**. After it's live you paste its URL into the app's
`.env` and rebuild — from then on, "Delete" in the admin panel removes the login
from Auth **and** the Firestore data.

---

## What you need

- A free Cloudflare account — https://dash.cloudflare.com/sign-up
- Your Firebase **service account** JSON (private, admin key)
- Your Firebase **Web API key** (the same `VITE_FIREBASE_API_KEY` already in `.env`)

### Get the service-account JSON
1. Firebase Console → ⚙️ **Project settings** → **Service accounts** tab.
2. Click **Generate new private key** → **Generate key**. A `.json` file downloads.
3. Keep this file secret. Never commit it or put it in the app bundle.

---

## Deploy (about 10–15 minutes, one time)

From a terminal, inside this `worker/` folder:

```bash
cd worker
npm install                 # installs wrangler (Cloudflare CLI)
npx wrangler login          # opens the browser to authorise Cloudflare

# Store the two secrets (you'll be prompted to paste the value):
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
#   → open the downloaded .json, copy its ENTIRE contents, paste, press Enter
npx wrangler secret put FIREBASE_API_KEY
#   → paste your VITE_FIREBASE_API_KEY value, press Enter

# (optional) edit wrangler.toml → set ALLOWED_ORIGIN to your real domain
#   e.g. ALLOWED_ORIGIN = "https://yourdomain.com"

npx wrangler deploy
```

`wrangler deploy` prints a URL like:

```
https://mjaconsult-delete-account.<your-subdomain>.workers.dev
```

Copy that URL.

---

## Connect it to the app

1. Open the project's **`.env`** and add this line (paste your worker URL):

   ```
   VITE_DELETE_WORKER_URL=https://mjaconsult-delete-account.<your-subdomain>.workers.dev
   ```

2. Rebuild the site and re-upload `dist/` to Hostinger:

   ```bash
   npm run build
   ```

That's it. Now the admin **Delete** button removes the user from Firebase
Authentication and Firestore in one click.

> If `VITE_DELETE_WORKER_URL` is left empty, the app still works — it just
> removes the Firestore data and reminds you to delete the leftover login in the
> Firebase console manually. Setting up the worker makes that automatic.

---

## How it stays secure

- The service-account key lives **only** as an encrypted Cloudflare secret —
  never in the website code that visitors download.
- Every request must include the caller's Firebase **ID token**. The worker
  verifies it and confirms the caller's `users/{uid}.role == "admin"` (or matches
  `ADMIN_EMAIL`) before deleting anything.
- The worker refuses to delete the admin's own account.
- Set `ALLOWED_ORIGIN` to your real domain to lock down CORS.
