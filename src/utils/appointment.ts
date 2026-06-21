import { parseISO } from "date-fns";
import type { Appointment, Promotion } from "@/types";

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

// ---- Appointment time window -------------------------------------------

/** Build the real start/end Date for an appointment from its date + slot. */
export function appointmentWindow(appt: Appointment): { start: Date; end: Date } {
  const base = parseISO(appt.date);
  const [sh, sm] = appt.slot.start.split(":").map(Number);
  const [eh, em] = appt.slot.end.split(":").map(Number);
  const start = new Date(base);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(base);
  end.setHours(eh, em, 0, 0);
  return { start, end };
}

/**
 * True while the appointment is actively happening — i.e. now is within the
 * booked slot, the appointment is settled and not cancelled. Used to gate
 * messaging and Meet-link requests to the consultation window only.
 */
export function isAppointmentLive(
  appt: Appointment,
  now: number = Date.now(),
): boolean {
  if (appt.status === "cancelled" || !isPaid(appt)) return false;
  const { start, end } = appointmentWindow(appt);
  return now >= start.getTime() && now <= end.getTime();
}

/** True once the booked slot's end time has passed. */
export function appointmentEnded(
  appt: Appointment,
  now: number = Date.now(),
): boolean {
  return now > appointmentWindow(appt).end.getTime();
}

/**
 * A Google Meet link can be requested only while the appointment is live
 * (within its slot), settled, confirmed and doesn't already have a link.
 */
export function canRequestMeet(appt: Appointment): boolean {
  return (
    appt.status === "confirmed" &&
    !appt.meetLink &&
    !appt.meetRequested &&
    isAppointmentLive(appt)
  );
}

/**
 * Doctor–patient messaging unlocks only during the live appointment window
 * (and only once payment is settled and the appointment isn't cancelled).
 */
export function canMessage(appt: Appointment): boolean {
  return isAppointmentLive(appt);
}

// ---- Promotions ---------------------------------------------------------

/** Whether a promotion is currently usable for a given doctor. */
export function promoApplies(promo: Promotion, doctorId: string): boolean {
  if (!promo.active) return false;
  if (promo.expiresAt) {
    const exp = parseISO(promo.expiresAt);
    // expires at end of the given day
    exp.setHours(23, 59, 59, 999);
    if (Date.now() > exp.getTime()) return false;
  }
  const ids = promo.doctorIds ?? [];
  return ids.length === 0 || ids.includes(doctorId);
}

/** Apply a promotion's fee criteria to a doctor's base fee. */
export function computePromoFee(baseFee: number, promo?: Promotion | null): number {
  if (!promo) return baseFee;
  // A free-consultation campaign is always free regardless of discount fields.
  if (promo.type === "free_campaign" || promo.discountType === "free") return 0;
  const value = promo.discountValue ?? 0;
  if (promo.discountType === "percent") {
    return Math.max(0, Math.round(baseFee * (1 - value / 100)));
  }
  if (promo.discountType === "flat") {
    return Math.max(0, baseFee - value);
  }
  return baseFee;
}

/** Short human label for a promotion's discount, e.g. "20% OFF" / "FREE". */
export function discountLabel(promo: Promotion): string | null {
  if (promo.type === "free_campaign" || promo.discountType === "free") return "FREE";
  if (promo.discountType === "percent" && promo.discountValue)
    return `${promo.discountValue}% OFF`;
  if (promo.discountType === "flat" && promo.discountValue)
    return `${promo.discountValue} OFF`;
  return null;
}
