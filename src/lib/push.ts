/**
 * Desktop popup notifications (free, no backend).
 *
 * Uses the browser Web Notifications API, driven by the app's existing
 * Firestore real-time listeners. When the site is open in a background tab or
 * a minimised window and a new notification/message arrives, a desktop popup
 * is shown. When the tab is focused we fall back to an in-app toast.
 *
 * NOTE: delivering a push to a FULLY CLOSED browser additionally requires
 * Firebase Cloud Messaging with a server to send (Cloud Functions / Blaze).
 * That can be layered on later — see README "Notifications".
 */

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : "denied";
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showSystemNotification(
  title: string,
  opts: { body?: string; tag?: string; url?: string } = {},
): void {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body: opts.body,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: opts.tag,
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      if (opts.url) window.location.assign(opts.url);
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/** True when the page is not currently visible to the user. */
export function pageHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}
