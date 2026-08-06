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

/**
 * A single medical license / certification the admin has verified and
 * uploaded on a doctor's behalf. A doctor may hold several (e.g. a national
 * council registration plus a specialty board certification), each with its
 * own expiry.
 */
export interface DoctorLicense {
  id: string;
  /** e.g. "PMC Medical License", "Board Certification (Cardiology)". */
  title: string;
  /** Optional registration/license number shown for reference. */
  licenseNumber?: string;
  /** Cloudinary URL of the uploaded license document/image. */
  documentUrl: string;
  /** ISO date ("YYYY-MM-DD") the license expires. */
  expiryDate: string;
  uploadedAt?: FireDate;
}

/** Extended doctor profile in `doctors/{uid}`. */
export interface Doctor extends AppUser {
  role: "doctor";
  specialization: string;
  bio?: string;
  experienceYears?: number;
  qualifications?: string;
  languages?: string[];
  /** Country the doctor practises/is based in (admin-managed). */
  country?: string;
  fees: number; // consultation fee in local currency
  currency?: string;
  rating?: number;
  reviewCount?: number;
  /** Which weekdays the doctor works, mapped to their slots. */
  availability: Partial<Record<Weekday, TimeSlot[]>>;
  /** Minutes per consultation, used to render slots. */
  slotDurationMins?: number;
  /**
   * IANA timezone (e.g. "Asia/Karachi") that the doctor's availability slots
   * are defined in. Used to convert bookable times correctly for patients
   * anywhere in the world. Defaults to the browser's timezone if unset.
   */
  timezone?: string;
  /**
   * The doctor's personal signature/stamp image (uploaded & managed by the
   * admin). Stamped on the bottom-right of prescriptions this doctor issues.
   */
  stampUrl?: string;
  /**
   * Medical licenses/certifications the admin has verified for this doctor.
   * Drives the patient-facing "Verified" badge and blocks login once expired
   * — see `src/utils/license.ts`.
   */
  licenses?: DoctorLicense[];
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
  /** ISO date string "YYYY-MM-DD", interpreted in `doctorTimezone`. */
  date: string;
  slot: TimeSlot;
  /**
   * Snapshot of the doctor's IANA timezone at booking time — `date` + `slot`
   * are wall-clock times in this zone. Falls back to "UTC" if absent (older
   * appointments booked before timezone tracking was added).
   */
  doctorTimezone?: string;
  /**
   * Snapshot of the booking patient's own IANA timezone (their browser's, at
   * booking time). Used only to personalize post-booking notification text
   * ("...your time") — display logic elsewhere derives the viewer's timezone
   * live instead, since it's more reliable than this snapshot.
   */
  patientTimezone?: string;
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
  /**
   * The universal company seal/stamp (uploaded by the admin) printed on every
   * prescription, alongside the issuing doctor's personal stamp.
   */
  companyStampUrl?: string;
}

/** A single medicine line on a prescription. */
export interface PrescriptionMedicine {
  /** e.g. "Tab. Aspirin 75mg". */
  name: string;
  /** e.g. "1 tablet". */
  dosage?: string;
  /** e.g. "Once daily" / "1 + 0 + 1". */
  frequency?: string;
  /** e.g. "30 days". */
  duration?: string;
  /** e.g. "After meals". */
  notes?: string;
}

/**
 * A prescription a doctor issues to a patient, rendered as the MJACONSULT
 * letterhead (210×150mm, half-A4). Stored in `prescriptions/{appointmentId}`
 * (one per appointment). The doctor + company stamps are snapshotted onto the
 * document at issue time so it stays stable even if the admin later changes a
 * stamp.
 */
export interface Prescription {
  id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization?: string;
  patientId: string;
  patientName: string;
  patientAge?: string;
  patientSex?: "male" | "female" | "other" | "";
  /** ISO date the prescription was issued ("YYYY-MM-DD"). */
  date: string;
  diagnosis?: string;
  medicines: PrescriptionMedicine[];
  advice?: string;
  /** Optional follow-up date (ISO). */
  followUpDate?: string;
  /** Snapshot of the issuing doctor's stamp (admin-managed). */
  doctorStampUrl?: string;
  /** Snapshot of the universal company seal (admin-managed). */
  companyStampUrl?: string;
  createdAt?: FireDate;
  updatedAt?: FireDate;
}

export type BannerMediaType = "image" | "video";

/** A homepage banner/video slide managed by the admin in `settings/banners`. */
export interface Banner {
  id: string;
  /** "image" = Cloudinary/any image URL; "video" = YouTube URL. */
  type: BannerMediaType;
  url: string;
  title?: string;
  subtitle?: string;
  /** Optional CTA button destination. */
  link?: string;
  linkLabel?: string;
  active: boolean;
  /** Display order (ascending). */
  order: number;
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
