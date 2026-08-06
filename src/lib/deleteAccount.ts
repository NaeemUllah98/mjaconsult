import { auth } from "./firebase";

/**
 * Calls the secure "delete account" worker (see /worker) which removes a user
 * from Firebase Authentication AND their Firestore docs — something a
 * browser-only Spark app cannot do on its own.
 *
 * Configure the endpoint in `.env`:
 *   VITE_DELETE_WORKER_URL=https://mjaconsult-delete-account.<sub>.workers.dev
 */
const WORKER_URL = (import.meta.env.VITE_DELETE_WORKER_URL as string | undefined)?.trim();

/** True when the delete worker has been deployed and wired up. */
export const isAuthDeleteConfigured = Boolean(WORKER_URL);

/**
 * Delete a user's Auth login + Firestore records via the worker.
 * Throws if the worker is not configured or the delete fails.
 */
export async function deleteAuthAccount(uid: string): Promise<void> {
  if (!WORKER_URL) {
    throw new Error("delete-worker-not-configured");
  }
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error("You must be signed in as admin to delete accounts.");
  }

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, uid }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Delete failed (${res.status}).`);
  }
}
