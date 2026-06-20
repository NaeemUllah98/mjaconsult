import { isFirebaseConfigured } from "@/lib/firebase";
import { buildSeed, DEMO_PASSWORDS, type DemoDB } from "./seed";
import type {
  AppUser,
  Doctor,
  Appointment,
  Promotion,
  ChatThread,
  ChatMessage,
  AppNotification,
  TimeSlot,
} from "@/types";

/** DEMO mode is active whenever Firebase keys are absent. */
export const DEMO = !isFirebaseConfigured;

const STORAGE_KEY = "mjaconsult_demo_db_v1";

// ---- persistence --------------------------------------------------------

function reviveDates(db: DemoDB): DemoDB {
  // JSON.parse turns Dates into strings; convert known date fields back.
  const fix = (o: any) => {
    if (o && typeof o.createdAt === "string") o.createdAt = new Date(o.createdAt);
    if (o && typeof o.updatedAt === "string") o.updatedAt = new Date(o.updatedAt);
    return o;
  };
  db.users.forEach(fix);
  db.doctors.forEach(fix);
  db.appointments.forEach(fix);
  db.promotions.forEach(fix);
  db.chats.forEach(fix);
  db.notifications.forEach(fix);
  Object.values(db.messages).forEach((arr) => arr.forEach(fix));
  return db;
}

function load(): DemoDB {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return reviveDates(JSON.parse(raw));
      } catch {
        /* fall through to fresh seed */
      }
    }
  }
  const fresh = buildSeed();
  persist(fresh);
  return fresh;
}

function persist(database: DemoDB) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  }
}

const db: DemoDB = DEMO ? load() : (buildSeed() as DemoDB);

function save() {
  persist(db);
  emit("any");
}

/** Wipe demo data and reseed (used by a "Reset demo" control). */
export function resetDemo() {
  const fresh = buildSeed();
  Object.assign(db, fresh);
  persist(db);
  emit("any");
  emit("chats");
  emit("notifications");
}

// ---- pub/sub ------------------------------------------------------------

type Topic = "any" | "chats" | "notifications" | string; // string = `messages:${threadId}`
const listeners: Record<string, Set<() => void>> = {};

function emit(topic: Topic) {
  listeners[topic]?.forEach((cb) => cb());
}
function on(topic: Topic, cb: () => void): () => void {
  (listeners[topic] ??= new Set()).add(cb);
  return () => listeners[topic]?.delete(cb);
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const ms = (d: any) => (d ? new Date(d).getTime() : 0);

// ---- auth ---------------------------------------------------------------

export function demoCurrentUser(): AppUser | null {
  if (!db.currentUid) return null;
  return db.users.find((u) => u.uid === db.currentUid) ?? null;
}

export function demoLogin(email: string, password: string): AppUser {
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user) throw { code: "auth/user-not-found" };
  const expected = DEMO_PASSWORDS[user.uid] ?? "patient123";
  if (password !== expected) throw { code: "auth/wrong-password" };
  db.currentUid = user.uid;
  save();
  return clone(user);
}

export function demoLoginAs(uid: string): AppUser {
  const user = db.users.find((u) => u.uid === uid);
  if (!user) throw { code: "auth/user-not-found" };
  db.currentUid = uid;
  save();
  return clone(user);
}

export function demoRegister(
  name: string,
  email: string,
  phone: string,
): AppUser {
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw { code: "auth/email-already-in-use" };
  }
  const user: AppUser = {
    uid: `demo-pt-${Date.now()}`,
    role: "patient",
    name,
    email,
    phone,
    active: true,
    createdAt: new Date(),
  };
  db.users.push(user);
  db.currentUid = user.uid;
  save();
  return clone(user);
}

export function demoSignOut() {
  db.currentUid = null;
  save();
}

// ---- users --------------------------------------------------------------

export function demoGetUser(uid: string): AppUser | null {
  return clone(db.users.find((u) => u.uid === uid) ?? null);
}

export function demoUpdateUser(uid: string, patch: Partial<AppUser>) {
  const u = db.users.find((x) => x.uid === uid);
  if (u) Object.assign(u, patch);
  save();
}

export function demoListPatients(): AppUser[] {
  return clone(db.users.filter((u) => u.role === "patient"));
}

export function demoListAdmins(): AppUser[] {
  return clone(db.users.filter((u) => u.role === "admin"));
}

export function demoDeleteUser(uid: string) {
  db.users = db.users.filter((u) => u.uid !== uid);
  save();
}

// ---- doctors ------------------------------------------------------------

export function demoGetDoctor(uid: string): Doctor | null {
  return clone(db.doctors.find((d) => d.uid === uid) ?? null);
}

export function demoListDoctors(activeOnly = false): Doctor[] {
  let list = db.doctors;
  if (activeOnly) list = list.filter((d) => d.active);
  return clone(list);
}

export function demoUpsertDoctor(doc: Doctor) {
  const i = db.doctors.findIndex((d) => d.uid === doc.uid);
  if (i >= 0) db.doctors[i] = { ...db.doctors[i], ...doc };
  else db.doctors.push(doc);
  // keep users record in sync
  const u = db.users.find((x) => x.uid === doc.uid);
  if (u) Object.assign(u, { name: doc.name, email: doc.email, phone: doc.phone, active: doc.active });
  else
    db.users.push({
      uid: doc.uid,
      role: "doctor",
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      active: doc.active,
      createdAt: new Date(),
    });
  save();
}

export function demoSetDoctorActive(uid: string, active: boolean) {
  const d = db.doctors.find((x) => x.uid === uid);
  if (d) d.active = active;
  const u = db.users.find((x) => x.uid === uid);
  if (u) u.active = active;
  save();
}

export function demoDeleteDoctor(uid: string) {
  db.doctors = db.doctors.filter((d) => d.uid !== uid);
  db.users = db.users.filter((u) => u.uid !== uid);
  save();
}

// ---- appointments -------------------------------------------------------

export function demoBookAppointment(
  input: Omit<Appointment, "id" | "createdAt" | "updatedAt" | "status">,
): string {
  const taken = db.appointments.some(
    (a) =>
      a.doctorId === input.doctorId &&
      a.date === input.date &&
      a.slot.start === input.slot.start &&
      a.status !== "cancelled",
  );
  if (taken) throw new Error("SLOT_TAKEN");
  const id = `demo-appt-${Date.now()}`;
  db.appointments.push({
    ...input,
    id,
    status: "confirmed",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  save();
  return id;
}

export function demoGetTakenSlots(doctorId: string, date: string): string[] {
  return db.appointments
    .filter(
      (a) =>
        a.doctorId === doctorId && a.date === date && a.status !== "cancelled",
    )
    .map((a) => a.slot.start);
}

export function demoUpdateAppointment(id: string, patch: Partial<Appointment>) {
  const a = db.appointments.find((x) => x.id === id);
  if (a) Object.assign(a, patch, { updatedAt: new Date() });
  save();
}

export function demoCancelAppointment(id: string) {
  const a = db.appointments.find((x) => x.id === id);
  if (a) {
    a.status = "cancelled";
    a.updatedAt = new Date();
  }
  save();
}

export function demoListAppointmentsFor(
  field: "patientId" | "doctorId",
  id: string,
): Appointment[] {
  return clone(
    db.appointments
      .filter((a) => a[field] === id)
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
}

export function demoListAllAppointments(): Appointment[] {
  return clone(
    [...db.appointments].sort((a, b) => b.date.localeCompare(a.date)),
  );
}

// ---- promotions ---------------------------------------------------------

export function demoListPromotions(activeOnly = false): Promotion[] {
  let list = db.promotions;
  if (activeOnly) list = list.filter((p) => p.active);
  return clone([...list].sort((a, b) => ms(b.createdAt) - ms(a.createdAt)));
}

export function demoCreatePromotion(p: Omit<Promotion, "id" | "createdAt">): string {
  const id = `demo-promo-${Date.now()}`;
  db.promotions.push({ ...p, id, createdAt: new Date() });
  save();
  return id;
}

export function demoUpdatePromotion(id: string, patch: Partial<Promotion>) {
  const p = db.promotions.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  save();
}

export function demoDeletePromotion(id: string) {
  db.promotions = db.promotions.filter((p) => p.id !== id);
  save();
}

// ---- chat ---------------------------------------------------------------

export function demoEnsureThread(args: {
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  patientPhotoURL?: string;
  doctorPhotoURL?: string;
}): string {
  const id = `${args.patientId}__${args.doctorId}`;
  let t = db.chats.find((c) => c.id === id);
  if (!t) {
    t = {
      id,
      patientId: args.patientId,
      doctorId: args.doctorId,
      patientName: args.patientName,
      doctorName: args.doctorName,
      patientPhotoURL: args.patientPhotoURL,
      doctorPhotoURL: args.doctorPhotoURL,
      updatedAt: new Date(),
      unread: {},
    };
    db.chats.push(t);
    db.messages[id] = [];
  }
  save();
  emit("chats");
  return id;
}

export function demoSendMessage(
  id: string,
  senderId: string,
  recipientId: string,
  text: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  (db.messages[id] ??= []).push({
    id: `m-${Date.now()}`,
    senderId,
    text: trimmed,
    createdAt: new Date(),
  });
  const t = db.chats.find((c) => c.id === id);
  if (t) {
    t.lastMessage = trimmed;
    t.lastSenderId = senderId;
    t.updatedAt = new Date();
    t.unread = { ...(t.unread ?? {}), [recipientId]: (t.unread?.[recipientId] ?? 0) + 1 };
  }
  save();
  emit("chats");
  emit(`messages:${id}`);
}

export function demoMarkThreadRead(id: string, userId: string) {
  const t = db.chats.find((c) => c.id === id);
  if (t) t.unread = { ...(t.unread ?? {}), [userId]: 0 };
  save();
  emit("chats");
}

export function demoSubscribeThreads(
  field: "patientId" | "doctorId",
  userId: string,
  cb: (threads: ChatThread[]) => void,
): () => void {
  const run = () =>
    cb(
      clone(
        db.chats
          .filter((c) => c[field] === userId)
          .sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt)),
      ),
    );
  run();
  return on("chats", run);
}

export function demoSubscribeAllThreads(
  cb: (threads: ChatThread[]) => void,
): () => void {
  const run = () =>
    cb(
      clone(
        [...db.chats].sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt)),
      ),
    );
  run();
  return on("chats", run);
}

export function demoSubscribeMessages(
  id: string,
  cb: (msgs: ChatMessage[]) => void,
): () => void {
  const run = () =>
    cb(
      clone(
        [...(db.messages[id] ?? [])].sort(
          (a, b) => ms(a.createdAt) - ms(b.createdAt),
        ),
      ),
    );
  run();
  return on(`messages:${id}`, run);
}

// ---- notifications ------------------------------------------------------

export function demoPushNotification(
  n: Omit<AppNotification, "id" | "read" | "createdAt">,
) {
  db.notifications.push({
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date(),
  });
  save();
  emit("notifications");
}

export function demoSubscribeNotifications(
  userId: string,
  cb: (items: AppNotification[]) => void,
): () => void {
  const run = () =>
    cb(
      clone(
        db.notifications
          .filter((n) => n.userId === userId)
          .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
          .slice(0, 30),
      ),
    );
  run();
  return on("notifications", run);
}

export function demoMarkNotificationRead(id: string) {
  const n = db.notifications.find((x) => x.id === id);
  if (n) n.read = true;
  save();
  emit("notifications");
}
