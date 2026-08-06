import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import * as demo from "./demo/backend";
import type { DoctorLicense } from "@/types";

/**
 * Create a new Doctor login + profile WITHOUT signing the admin out.
 *
 * Firebase's client SDK swaps the "current user" whenever you create an
 * account, which would log the admin out. The standard free workaround (no
 * Cloud Functions / Admin SDK needed) is to spin up a SECONDARY Firebase app
 * instance, create the user there, write the Firestore docs, then tear the
 * secondary app down. The admin's primary session is untouched.
 */
const secondaryConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export interface NewDoctorInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  specialization: string;
  fees: number;
  currency?: string;
  photoURL?: string;
  qualifications?: string;
  experienceYears?: number;
  bio?: string;
  /** Country the doctor practises/is based in. */
  country?: string;
  /** Admin-uploaded signature stamp printed on this doctor's prescriptions. */
  stampUrl?: string;
  /** Admin-verified medical licenses; drives the "Verified" badge + login gate. */
  licenses?: DoctorLicense[];
}

export async function createDoctorAccount(input: NewDoctorInput): Promise<void> {
  if (demo.DEMO) {
    const uid = `demo-doc-${Date.now()}`;
    demo.demoUpsertDoctor({
      uid,
      role: "doctor",
      name: input.name,
      email: input.email,
      phone: input.phone ?? "",
      photoURL: input.photoURL ?? "",
      active: true,
      specialization: input.specialization,
      qualifications: input.qualifications ?? "",
      experienceYears: input.experienceYears ?? 0,
      bio: input.bio ?? "",
      country: input.country ?? "",
      fees: input.fees,
      currency: input.currency ?? "USD",
      availability: {},
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      stampUrl: input.stampUrl ?? "",
      licenses: input.licenses ?? [],
    });
    return;
  }
  const secondary = initializeApp(secondaryConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  const secondaryDb = getFirestore(secondary);
  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.email,
      input.password,
    );
    await updateProfile(cred.user, { displayName: input.name });
    const uid = cred.user.uid;

    // Write the doctor's records using the NEW DOCTOR'S OWN session
    // (the secondary app is signed in as them). This satisfies the security
    // rules — a user may create their own `users` doc and their own `doctors`
    // doc — without the admin needing write access to another user's record.
    const doctorProfile = {
      role: "doctor",
      name: input.name,
      email: input.email,
      phone: input.phone ?? "",
      photoURL: input.photoURL ?? "",
      active: true,
      specialization: input.specialization,
      qualifications: input.qualifications ?? "",
      experienceYears: input.experienceYears ?? 0,
      bio: input.bio ?? "",
      country: input.country ?? "",
      fees: input.fees,
      currency: input.currency ?? "USD",
      availability: {},
      slotDurationMins: 30,
      timezone: "Asia/Karachi",
      stampUrl: input.stampUrl ?? "",
      licenses: input.licenses ?? [],
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(secondaryDb, "doctors", uid), doctorProfile, {
      merge: true,
    });
    await setDoc(
      doc(secondaryDb, "users", uid),
      {
        role: "doctor",
        name: input.name,
        email: input.email,
        phone: input.phone ?? "",
        photoURL: input.photoURL ?? "",
        active: true,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );

    await signOut(secondaryAuth);
  } finally {
    await deleteApp(secondary);
  }
}
