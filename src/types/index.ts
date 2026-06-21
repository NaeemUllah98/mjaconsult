import type { Timestamp } from "firebase/firestore";

export type Role = "admin" | "doctor" | "patient";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "proof_submitted"
  | "verified"
  | "rejected"
  | "free";

export type FireDate = Timestamp | Date | null;

/** Base account record stored in `users/{uid}`. */
export interface AppUser {
  uid: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  active: boolean;
  createdAt?: FireDate;
  /** Live presence — refreshed by a heartbeat while the app is open. */
  online?: boolean;
  lastSeenAt?: FireDate;
}

/** Weekday key used for availability maps. */
export type Weekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

/** A single bookable time block, e.g. "09:00" - "09:30". */
export interface TimeSlot {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

/** Extended doctor profile in `doctors/{uid}`. */
export interface Doctor extends AppUser {
  role: "doctor";
  specialization: string;
  bio?: string;
  experienceYears?: number;
  qualifications?: string;
  languages?: string[];
  fees: number; // consultation fee in local currency
  currency?: string;
  rating?: number;
  reviewCount?: number;
  /** Which weekdays the doctor works, mapped to their slots. */
  availability: Partial<Record<Weekday, TimeSlot[]>>;
  /** Minutes per consultation, used to render slots. */
  slotDurationMins?: number;
}

/** Patient profile extras in `patients/{uid}` (optional, base is `users`). */
export interface Patient extends AppUser {
  role: "patient";
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "";
  bloodGroup?: string;
  address?: string;
}

/** A booked appointment in `appointments/{id}`. */
export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization?: string;
  doctorPhotoURL?: string;
  /** ISO date string "YYYY-MM-DD". */
  date: string;
  slot: TimeSlot;
  status: AppointmentStatus;
  reason?: string;
  fee: number;
  isFree: boolean;
  /** Set when the appointment was booked through a promotion/offer. */
  promoId?: string;
  promoTitle?: string;
  /** The doctor's list fee before any promotion discount was applied. */
  originalFee?: number;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string;
  meetLink?: string;
  /** Set when a doctor/patient asks the admin to create the Meet link. */
  meetRequested?: boolean;
  meetRequestedByName?: string;
  createdAt?: FireDate;
  updatedAt?: FireDate;
}

/** Chat thread in `chats/{chatId}` where chatId = `${patientId}__${doctorId}`. */
export interface ChatThread {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  patientPhotoURL?: string;
  doctorPhotoURL?: string;
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt?: FireDate;
  unread?: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  /** Optional shared report/attachment (image preview or downloadable file). */
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: "image" | "file";
  createdAt?: FireDate;
}

export type PromotionType = "promo" | "free_campaign";

/** How a promotion adjusts the consultation fee for patients who claim it. */
export type DiscountType = "percent" | "flat" | "free" | "none";

/** Promotional offer / free-consultation campaign in `promotions/{id}`. */
export interface Promotion {
  id: string;
  type: PromotionType;
  title: string;
  description: string;
  imageUrl?: string;
  /** For free campaigns / targeted offers: which doctor(s) it applies to (empty = all). */
  doctorIds?: string[];
  /** Fee criteria applied when a patient books through this offer. */
  discountType?: DiscountType;
  /** Percent (0–100) when discountType==='percent', else a flat amount off. */
  discountValue?: number;
  active: boolean;
  expiresAt?: string; // ISO date
  createdAt?: FireDate;
}

/** One bank account shown to patients on the payment popup. */
export interface BankAccount {
  bank: string;
  title: string; // account title / holder name
  number: string; // account number or IBAN
}

/** Admin-editable payment settings in `settings/payment`. */
export interface PaymentSettings {
  pkAccount: BankAccount;
  uaeAccount: BankAccount;
  instructions?: string;
}

/** Public site settings in `settings/site` (e.g. the homepage hero doctor). */
export interface SiteSettings {
  /** Which doctor is promoted on the public landing page (empty = auto). */
  featuredDoctorId?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type?: "appointment" | "payment" | "promo" | "chat" | "system";
  link?: string;
  read: boolean;
  createdAt?: FireDate;
}
