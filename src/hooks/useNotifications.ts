import { useEffect, useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeNotifications } from "@/lib/notifications";
import * as demo from "@/lib/demo/backend";
import type { AppNotification } from "@/types";

export function useNotifications(userId?: string) {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) return;
    return subscribeNotifications(userId, setItems);
  }, [userId]);

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    if (demo.DEMO) return demo.demoMarkNotificationRead(id);
    await updateDoc(doc(db, "notifications", id), { read: true }).catch(() => {});
  };
  const markAllRead = async () => {
    await Promise.all(items.filter((n) => !n.read).map((n) => markRead(n.id)));
  };

  return { items, unread, markRead, markAllRead };
}
