import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { subscribeNotifications } from "@/lib/notifications";
import { subscribeThreads } from "@/lib/chat";
import { showSystemNotification, pageHidden } from "@/lib/push";
import type { AppUser, FireDate } from "@/types";

const ms = (d: FireDate): number => {
  if (!d) return 0;
  if (typeof (d as any).toMillis === "function") return (d as any).toMillis();
  if (d instanceof Date) return d.getTime();
  return new Date(d as any).getTime();
};

/**
 * Show a popup for new notifications and new chat messages. When the page is
 * in the background a desktop notification fires; when focused, an in-app
 * toast. Mounted once in the dashboard layout so it covers every panel.
 */
function deliver(title: string, body?: string, url?: string) {
  if (pageHidden()) {
    showSystemNotification(title, { body, url, tag: url ?? title });
  } else {
    toast(body ? `${title} — ${body}` : title, { icon: "🔔" });
  }
}

export function useNotificationPopups(user: AppUser | null) {
  const seenNotif = useRef<Set<string>>(new Set());
  const notifReady = useRef(false);
  const threadSeen = useRef<Map<string, number>>(new Map());
  const threadReady = useRef(false);

  // ---- Notifications collection (all panels) ----
  useEffect(() => {
    if (!user?.uid) return;
    seenNotif.current = new Set();
    notifReady.current = false;
    return subscribeNotifications(user.uid, (items) => {
      if (!notifReady.current) {
        // First snapshot = existing history; remember it, don't pop.
        items.forEach((n) => seenNotif.current.add(n.id));
        notifReady.current = true;
        return;
      }
      items
        .filter((n) => !seenNotif.current.has(n.id))
        .forEach((n) => {
          seenNotif.current.add(n.id);
          deliver(n.title, n.body, n.link);
        });
    });
  }, [user?.uid]);

  // ---- Chat messages (patient & doctor are participants) ----
  useEffect(() => {
    if (!user?.uid || (user.role !== "patient" && user.role !== "doctor")) return;
    const field = user.role === "patient" ? "patientId" : "doctorId";
    const chatUrl = user.role === "patient" ? "/patient/chat" : "/doctor/chat";
    threadSeen.current = new Map();
    threadReady.current = false;
    return subscribeThreads(field, user.uid, (threads) => {
      if (!threadReady.current) {
        threads.forEach((t) => threadSeen.current.set(t.id, ms(t.updatedAt ?? null)));
        threadReady.current = true;
        return;
      }
      threads.forEach((t) => {
        const prev = threadSeen.current.get(t.id) ?? 0;
        const cur = ms(t.updatedAt ?? null);
        if (cur > prev) {
          threadSeen.current.set(t.id, cur);
          // Only pop for messages the OTHER person sent.
          if (t.lastSenderId && t.lastSenderId !== user.uid) {
            const who =
              field === "patientId" ? t.doctorName : t.patientName;
            deliver(`New message from ${who}`, t.lastMessage, chatUrl);
          }
        }
      });
    });
  }, [user?.uid, user?.role]);
}
