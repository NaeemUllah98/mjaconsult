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
  createdAt?: FireDate;
}

export type PromotionType = "promo" | "free_campaign";

/** Promotional offer / free-consultation campaign in `promotions/{id}`. */
export interface Promotion {
  id: string;
  type: PromotionType;
  title: string;
  description: string;
  imageUrl?: string;
  /** For free campaigns: which doctor(s) it applies to (empty = all). */
  doctorIds?: string[];
  active: boolean;
  expiresAt?: string; // ISO date
  createdAt?: FireDate;
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
