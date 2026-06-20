import type { Appointment } from "@/types";

/**
 * Payment is considered settled when the appointment is a free campaign,
 * or the uploaded payment proof has been verified by the doctor/admin.
 */
export function isPaid(appt: Appointment): boolean {
  return (
    appt.isFree ||
    appt.paymentStatus === "free" ||
    appt.paymentStatus === "verified"
  );
}

/**
 * A Google Meet link can be requested only once payment is settled and the
 * appointment is confirmed and doesn't already have (or have a pending) link.
 */
export function canRequestMeet(appt: Appointment): boolean {
  return (
    appt.status === "confirmed" &&
    !appt.meetLink &&
    !appt.meetRequested &&
    isPaid(appt)
  );
}

/**
 * Doctor–patient messaging unlocks only after payment is settled (and while
 * the appointment isn't cancelled).
 */
export function canMessage(appt: Appointment): boolean {
  return appt.status !== "cancelled" && isPaid(appt);
}
