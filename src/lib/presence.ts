import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import * as demo from "./demo/backend";

const DEMO = demo.DEMO;
const HEARTBEAT_MS = 60_000; // refresh "last seen" every minute

async function writePresence(uid: string, online: boolean): Promise<void> {
  if (DEMO) return demo.demoSetPresence(uid, online);
  const payload = { online, lastSeenAt: serverTimestamp() };
  // A doctor may write their own `doctors` and `users` records (see rules).
  await Promise.all([
    updateDoc(doc(db, "doctors", uid), payload).catch(() => {}),
    updateDoc(doc(db, "users", uid), payload).catch(() => {}),
  ]);
}

/**
 * Begin broadcasting presence for a logged-in doctor. Marks them online,
 * refreshes a heartbeat on an interval, and flips to offline when the tab is
 * hidden/closed. Returns a cleanup function that marks them offline.
 */
export function startPresence(uid: string): () => void {
  let stopped = false;
  void writePresence(uid, true);

  const beat = window.setInterval(() => {
    if (!stopped && document.visibilityState === "visible") {
      void writePresence(uid, true);
    }
  }, HEARTBEAT_MS);

  const onVisibility = () => {
    void writePresence(uid, document.visibilityState === "visible");
  };
  const onLeave = () => {
    void writePresence(uid, false);
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("beforeunload", onLeave);
  window.addEventListener("pagehide", onLeave);

  return () => {
    stopped = true;
    window.clearInterval(beat);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("beforeunload", onLeave);
    window.removeEventListener("pagehide", onLeave);
    void writePresence(uid, false);
  };
}
