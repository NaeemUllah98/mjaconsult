import emailjs from "@emailjs/browser";
import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import * as demo from "./demo/backend";
import type { AppNotification } from "@/types";

/**
 * Unified notification service.
 *
 * Channels:
 *  - in-app  : always on (Firestore `notifications` collection, real-time bell)
 *  - email   : EmailJS free tier (set the VITE_EMAILJS_* env vars)
 *  - whatsapp: stubbed today; the function signature is final so the real
 *              WhatsApp Cloud API call can be dropped in later without touching
 *              any caller. See sendWhatsApp() below.
 */

const EMAIL_SERVICE = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAIL_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export const isEmailConfigured = Boolean(
  EMAIL_SERVICE && EMAIL_TEMPLATE && EMAIL_PUBLIC_KEY,
);

// ---- In-app -------------------------------------------------------------

/** Live subscription to a user's notifications (real Firestore or demo). */
export function subscribeNotifications(
  userId: string,
  cb: (items: AppNotification[]) => void,
): () => void {
  if (demo.DEMO) return demo.demoSubscribeNotifications(userId, cb);
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(30),
  );
  return onSnapshot(
    q,
    (snap) =>
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification)),
    () => cb([]),
  );
}

export async function pushInAppNotification(
  notification: Omit<AppNotification, "id" | "read" | "createdAt">,
): Promise<void> {
  if (demo.DEMO) return demo.demoPushNotification(notification);
  try {
    await addDoc(collection(db, "notifications"), {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("in-app notification failed", err);
  }
}

// ---- Email (EmailJS) ----------------------------------------------------

export interface EmailPayload {
  toEmail: string;
  toName: string;
  subject: string;
  message: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info("[email skipped — EmailJS not configured]", payload.subject);
    return false;
  }
  try {
    await emailjs.send(
      EMAIL_SERVICE,
      EMAIL_TEMPLATE,
      {
        to_email: payload.toEmail,
        to_name: payload.toName,
        subject: payload.subject,
        message: payload.message,
      },
      { publicKey: EMAIL_PUBLIC_KEY },
    );
    return true;
  } catch (err) {
    console.warn("email send failed", err);
    return false;
  }
}

// ---- WhatsApp (future-ready) --------------------------------------------

export interface WhatsAppPayload {
  toPhone: string; // E.164, e.g. +15551234567
  templateName: string;
  variables: string[];
}

/**
 * Placeholder for WhatsApp Cloud API. Today it returns a `wa.me` deep link so
 * staff can send manually if they wish. When your Meta Business is verified,
 * replace the body with a fetch() to the Graph API `/messages` endpoint.
 */
export async function sendWhatsApp(
  payload: WhatsAppPayload,
): Promise<{ sent: boolean; fallbackLink: string }> {
  const text = encodeURIComponent(payload.variables.join(" "));
  const phone = payload.toPhone.replace(/[^\d]/g, "");
  const fallbackLink = `https://wa.me/${phone}?text=${text}`;
  // TODO: integrate Meta WhatsApp Cloud API here.
  return { sent: false, fallbackLink };
}

// ---- High-level helpers (used across the app) ---------------------------

interface NotifyArgs {
  userId: string;
  email?: string;
  name?: string;
  title: string;
  body: string;
  type?: AppNotification["type"];
  link?: string;
  sendEmailToo?: boolean;
}

/** Fan-out a single event to in-app (+ optionally email). */
export async function notify(args: NotifyArgs): Promise<void> {
  await pushInAppNotification({
    userId: args.userId,
    title: args.title,
    body: args.body,
    type: args.type,
    link: args.link,
  });

  if (args.sendEmailToo && args.email) {
    await sendEmail({
      toEmail: args.email,
      toName: args.name ?? "there",
      subject: args.title,
      message: args.body,
    });
  }
}
