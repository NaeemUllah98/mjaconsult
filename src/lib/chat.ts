import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import * as demo from "./demo/backend";
import type { ChatMessage, ChatThread } from "@/types";

const DEMO = demo.DEMO;

/** Deterministic chat id so patient & doctor always resolve the same thread. */
export const chatId = (patientId: string, doctorId: string) =>
  `${patientId}__${doctorId}`;

export interface EnsureThreadArgs {
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  patientPhotoURL?: string;
  doctorPhotoURL?: string;
}

export async function ensureThread(args: EnsureThreadArgs): Promise<string> {
  if (DEMO) return demo.demoEnsureThread(args);
  const id = chatId(args.patientId, args.doctorId);
  await setDoc(
    doc(db, "chats", id),
    {
      patientId: args.patientId,
      doctorId: args.doctorId,
      patientName: args.patientName,
      doctorName: args.doctorName,
      patientPhotoURL: args.patientPhotoURL ?? "",
      doctorPhotoURL: args.doctorPhotoURL ?? "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export async function sendMessage(
  id: string,
  senderId: string,
  recipientId: string,
  text: string,
): Promise<void> {
  if (DEMO) return demo.demoSendMessage(id, senderId, recipientId, text);
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "chats", id, "messages"), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chats", id), {
    lastMessage: trimmed,
    lastSenderId: senderId,
    updatedAt: serverTimestamp(),
    [`unread.${recipientId}`]: increment(1),
  });
}

export async function markThreadRead(id: string, userId: string): Promise<void> {
  if (DEMO) return demo.demoMarkThreadRead(id, userId);
  await updateDoc(doc(db, "chats", id), { [`unread.${userId}`]: 0 }).catch(
    () => {},
  );
}

/** Subscribe to all threads for a user (by role field). */
export function subscribeThreads(
  field: "patientId" | "doctorId",
  userId: string,
  cb: (threads: ChatThread[]) => void,
): () => void {
  if (DEMO) return demo.demoSubscribeThreads(field, userId, cb);
  const q = query(
    collection(db, "chats"),
    where(field, "==", userId),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatThread));
  });
}

/** Admin oversight: subscribe to ALL conversations on the platform. */
export function subscribeAllThreads(
  cb: (threads: ChatThread[]) => void,
): () => void {
  if (DEMO) return demo.demoSubscribeAllThreads(cb);
  const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatThread)),
    () => cb([]),
  );
}

/** Subscribe to messages within a thread, ordered oldest -> newest. */
export function subscribeMessages(
  id: string,
  cb: (msgs: ChatMessage[]) => void,
): () => void {
  if (DEMO) return demo.demoSubscribeMessages(id, cb);
  const q = query(
    collection(db, "chats", id, "messages"),
    orderBy("createdAt", "asc"),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage));
  });
}
