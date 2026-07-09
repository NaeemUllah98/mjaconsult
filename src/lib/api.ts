import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "./firebase";
import * as demo from "./demo/backend";
import { DEFAULT_PAYMENT_SETTINGS, DEFAULT_SITE_SETTINGS, DEFAULT_BANNERS } from "./demo/seed";
import type {
  AppUser,
  Doctor,
  Appointment,
  Promotion,
  Prescription,
  TimeSlot,
  PaymentSettings,
  SiteSettings,
  Banner,
} from "@/types";

const DEMO = demo.DEMO;

// ============================================================
// Users
// ============================================================

export async function getUser(uid: string): Promise<AppUser | null> {
  if (DEMO) return demo.demoGetUser(uid);
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid, ...snap.data() } as AppUser) : null;
}

export async function upsertUser(user: AppUser): Promise<void> {
  if (DEMO) return demo.demoUpdateUser(user.uid, user);
  const { uid, ...rest } = user;
  await setDoc(
    doc(db, "users", uid),
    { ...rest, createdAt: rest.createdAt ?? serverTimestamp() },
    { merge: true },
  );
}

export async function updateUser(
  uid: string,
  patch: Partial<AppUser>,
): Promise<void> {
  if (DEMO) return demo.demoUpdateUser(uid, patch);
  await updateDoc(doc(db, "users", uid), patch as any);
}

export async function listPatients(): Promise<AppUser[]> {
  if (DEMO) return demo.demoListPatients();
  const q = query(collection(db, "users"), where("role", "==", "patient"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
}

/**
 * Admin-initiated password reset.
 *  - DEMO: directly set a new password (in-memory).
 *  - Firebase (free Spark): send the patient a secure reset email. The client
 *    SDK can't set another user's password without the Admin SDK (Blaze), so
 *    the email flow is the correct zero-cost approach.
 *
 * Returns the channel used so the UI can show the right confirmation.
 */
export async function resetPatientPassword(
  email: string,
  newPassword?: string,
): Promise<"set" | "email"> {
  if (DEMO) {
    demo.demoSetPassword(email, newPassword ?? "patient123");
    return "set";
  }
  await sendPasswordResetEmail(auth, email);
  return "email";
}

/** All admin accounts (used to notify admins, e.g. on Meet-link requests). */
export async function listAdmins(): Promise<AppUser[]> {
  if (DEMO) return demo.demoListAdmins();
  const q = query(collection(db, "users"), where("role", "==", "admin"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
}

// ============================================================
// Doctors
// ============================================================

export async function getDoctor(uid: string): Promise<Doctor | null> {
  if (DEMO) return demo.demoGetDoctor(uid);
  const snap = await getDoc(doc(db, "doctors", uid));
  return snap.exists() ? ({ uid, ...snap.data() } as Doctor) : null;
}

export async function listDoctors(activeOnly = false): Promise<Doctor[]> {
  if (DEMO) return demo.demoListDoctors(activeOnly);
  const snap = await getDocs(collection(db, "doctors"));
  let docs = snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as Doctor);
  if (activeOnly) docs = docs.filter((d) => d.active);
  return docs;
}

/** Live subscription to all doctors (used by the admin to see presence). */
export function subscribeDoctors(cb: (docs: Doctor[]) => void): () => void {
  if (DEMO) return demo.demoSubscribeDoctors(cb);
  return onSnapshot(
    collection(db, "doctors"),
    (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as Doctor)),
    () => cb([]),
  );
}

export async function upsertDoctor(d: Doctor): Promise<void> {
  if (DEMO) return demo.demoUpsertDoctor(d);
  const { uid, ...rest } = d;
  await setDoc(doc(db, "doctors", uid), rest, { merge: true });
  await setDoc(
    doc(db, "users", uid),
    {
      role: "doctor",
      name: d.name,
      email: d.email,
      phone: d.phone ?? "",
      photoURL: d.photoURL ?? "",
      active: d.active,
    },
    { merge: true },
  );
}

export async function setDoctorActive(
  uid: string,
  active: boolean,
): Promise<void> {
  if (DEMO) return demo.demoSetDoctorActive(uid, active);
  await updateDoc(doc(db, "doctors", uid), { active });
  await updateDoc(doc(db, "users", uid), { active });
}

export async function deleteDoctor(uid: string): Promise<void> {
  if (DEMO) return demo.demoDeleteDoctor(uid);
  await deleteDoc(doc(db, "doctors", uid));
  await deleteDoc(doc(db, "users", uid));
}

// ============================================================
// Appointments  (with atomic slot locking)
// ============================================================

const slotId = (doctorId: string, date: string, slot: TimeSlot) =>
  `${doctorId}_${date}_${slot.start.replace(":", "")}`;

export async function bookAppointment(
  input: Omit<Appointment, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: Appointment["status"];
  },
): Promise<string> {
  if (DEMO) return demo.demoBookAppointment(input);
  const lockRef = doc(db, "slots", slotId(input.doctorId, input.date, input.slot));
  const apptRef = doc(collection(db, "appointments"));

  await runTransaction(db, async (tx) => {
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists() && lockSnap.data()?.taken) {
      throw new Error("SLOT_TAKEN");
    }
    tx.set(lockRef, {
      taken: true,
      appointmentId: apptRef.id,
      doctorId: input.doctorId,
      patientId: input.patientId,
      date: input.date,
      slot: input.slot,
      createdAt: serverTimestamp(),
    });
    tx.set(apptRef, {
      ...input,
      status: input.status ?? "confirmed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return apptRef.id;
}

export async function getTakenSlots(
  doctorId: string,
  date: string,
): Promise<string[]> {
  if (DEMO) return demo.demoGetTakenSlots(doctorId, date);
  const q = query(
    collection(db, "appointments"),
    where("doctorId", "==", doctorId),
    where("date", "==", date),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as Appointment)
    .filter((a) => a.status !== "cancelled")
    .map((a) => a.slot.start);
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Promise<void> {
  if (DEMO) return demo.demoUpdateAppointment(id, patch);
  await updateDoc(doc(db, "appointments", id), {
    ...patch,
    updatedAt: serverTimestamp(),
  } as any);
}

export async function cancelAppointment(appt: Appointment): Promise<void> {
  if (DEMO) return demo.demoCancelAppointment(appt.id);
  await updateDoc(doc(db, "appointments", appt.id), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
  await deleteDoc(
    doc(db, "slots", slotId(appt.doctorId, appt.date, appt.slot)),
  ).catch(() => {});
}

export async function listAppointmentsFor(
  field: "patientId" | "doctorId",
  id: string,
): Promise<Appointment[]> {
  if (DEMO) return demo.demoListAppointmentsFor(field, id);
  const q = query(
    collection(db, "appointments"),
    where(field, "==", id),
    orderBy("date", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment);
}

export async function listAllAppointments(): Promise<Appointment[]> {
  if (DEMO) return demo.demoListAllAppointments();
  const q = query(collection(db, "appointments"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment);
}

// ============================================================
// Promotions
// ============================================================

export async function listPromotions(activeOnly = false): Promise<Promotion[]> {
  if (DEMO) return demo.demoListPromotions(activeOnly);
  const snap = await getDocs(collection(db, "promotions"));
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Promotion);
  if (activeOnly) items = items.filter((p) => p.active);
  return items.sort((a, b) => {
    const at = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
    const bt = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
    return bt - at;
  });
}

export async function createPromotion(
  p: Omit<Promotion, "id" | "createdAt">,
): Promise<string> {
  if (DEMO) return demo.demoCreatePromotion(p);
  const ref = await addDoc(collection(db, "promotions"), {
    ...p,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePromotion(
  id: string,
  patch: Partial<Promotion>,
): Promise<void> {
  if (DEMO) return demo.demoUpdatePromotion(id, patch);
  await updateDoc(doc(db, "promotions", id), patch as any);
}

export async function deletePromotion(id: string): Promise<void> {
  if (DEMO) return demo.demoDeletePromotion(id);
  await deleteDoc(doc(db, "promotions", id));
}

// ============================================================
// Prescriptions  (stored at prescriptions/{appointmentId})
// ============================================================

export async function getPrescription(id: string): Promise<Prescription | null> {
  if (DEMO) return demo.demoGetPrescription(id);
  const snap = await getDoc(doc(db, "prescriptions", id));
  return snap.exists() ? ({ id, ...snap.data() } as Prescription) : null;
}

/** A prescription is keyed by its appointment id (one per appointment). */
export async function getPrescriptionForAppointment(
  appointmentId: string,
): Promise<Prescription | null> {
  if (DEMO) return demo.demoGetPrescriptionForAppointment(appointmentId);
  return getPrescription(appointmentId);
}

export async function savePrescription(p: Prescription): Promise<void> {
  if (DEMO) return demo.demoSavePrescription(p);
  const { id, createdAt, ...rest } = p;
  const payload: Record<string, unknown> = { ...rest, updatedAt: serverTimestamp() };
  if (!createdAt) payload.createdAt = serverTimestamp();
  await setDoc(doc(db, "prescriptions", id), payload, { merge: true });
}

export async function listPrescriptionsFor(
  field: "patientId" | "doctorId",
  id: string,
): Promise<Prescription[]> {
  if (DEMO) return demo.demoListPrescriptionsFor(field, id);
  // where-only (no composite index needed); sort newest-first client-side.
  const q = query(collection(db, "prescriptions"), where(field, "==", id));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Prescription)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function listAllPrescriptions(): Promise<Prescription[]> {
  if (DEMO) return demo.demoListAllPrescriptions();
  const snap = await getDocs(collection(db, "prescriptions"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Prescription)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================================
// Settings (payment accounts shown on the booking popup)
// ============================================================

export async function getPaymentSettings(): Promise<PaymentSettings> {
  if (DEMO) return demo.demoGetPaymentSettings();
  try {
    const snap = await getDoc(doc(db, "settings", "payment"));
    return snap.exists()
      ? (snap.data() as PaymentSettings)
      : DEFAULT_PAYMENT_SETTINGS;
  } catch (err) {
    // e.g. the `settings` security rule hasn't been deployed yet — fall back
    // to the placeholder accounts so the booking/payment flow still works.
    console.warn("getPaymentSettings failed; using defaults", err);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

export async function savePaymentSettings(
  settings: PaymentSettings,
): Promise<void> {
  if (DEMO) return demo.demoSavePaymentSettings(settings);
  await setDoc(doc(db, "settings", "payment"), settings, { merge: true });
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (DEMO) return demo.demoGetSiteSettings();
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    return snap.exists() ? (snap.data() as SiteSettings) : DEFAULT_SITE_SETTINGS;
  } catch (err) {
    // Public landing-page read; fall back gracefully if rules/network fail.
    console.warn("getSiteSettings failed; using defaults", err);
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  if (DEMO) return demo.demoSaveSiteSettings(settings);
  await setDoc(doc(db, "settings", "site"), settings, { merge: true });
}

export async function listBanners(activeOnly = false): Promise<Banner[]> {
  if (DEMO) return demo.demoListBanners(activeOnly);
  try {
    const snap = await getDoc(doc(db, "settings", "banners"));
    const items: Banner[] = snap.exists() ? ((snap.data().items as Banner[]) ?? []) : DEFAULT_BANNERS;
    const sorted = [...items].sort((a, b) => a.order - b.order);
    return activeOnly ? sorted.filter((b) => b.active) : sorted;
  } catch {
    return activeOnly ? DEFAULT_BANNERS.filter((b) => b.active) : DEFAULT_BANNERS;
  }
}

export async function saveBanners(banners: Banner[]): Promise<void> {
  if (DEMO) return demo.demoSaveBanners(banners);
  await setDoc(doc(db, "settings", "banners"), { items: banners }, { merge: false });
}
