import { addDays, format, parseISO } from "date-fns";
import { zonedTimeToUtc, dateInZone } from "@/utils/timezone";
import { weekdayFromISO } from "@/utils/format";
import type { Appointment, Doctor, Promotion, TimeSlot } from "@/types";

/** Today's calendar date as "yyyy-MM-dd", using the viewer's local clock. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whether a "yyyy-MM-dd" date is today or later (i.e. not yet past). */
export function isUpcomingDate(dateISO: string): boolean {
  return dateISO >= todayISO();
}

/** Whether a "yyyy-MM-dd" date is strictly before today. */
export function isPastDate(dateISO: string): boolean {
  return dateISO < todayISO();
}

/** Whether a "yyyy-MM-dd" date is strictly after today. */
export function isFutureDate(dateISO: string): boolean {
  return dateISO > todayISO();
}

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

// ---- Cross-timezone slot resolution ------------------------------------

/** A doctor's slot, resolved to the real calendar day (in EACH party's own
 * timezone) and real UTC instant it falls on — see resolveSlotsForPatientDay. */
export interface ResolvedSlot {
  slot: TimeSlot;
  /** The doctor's OWN calendar day this slot occurs on. This is what must be
   * stored as `Appointment.date` — it is NOT always the same calendar day the
   * patient was browsing (see below). */
  doctorDateISO: string;
  startUtc: Date;
  endUtc: Date;
}

/**
 * A doctor's availability is defined per weekday, in wall-clock times
 * meaningful only in THEIR OWN timezone. A patient browsing a specific
 * calendar day in THEIR OWN timezone is not always looking at the same
 * calendar day for the doctor — e.g. an 11:45 PM slot in Dubai is 12:45 AM
 * the *next* day in Pakistan (an hour ahead). Naively keying off "the weekday
 * name of the date the patient clicked" gets slots like this wrong: hidden
 * under the wrong day chip, or — if shown — stored with the wrong calendar
 * date from the doctor's perspective.
 *
 * This resolves the correct set of bookable slots for a given patient-local
 * day by checking the (at most two) doctor-local calendar days that could
 * overlap it, converting each candidate slot to its real UTC instant, and
 * keeping only the ones that actually land inside the patient's chosen day.
 * Each result carries its own correct `doctorDateISO` — two slots shown
 * under the same patient-local day chip can legitimately belong to two
 * different doctor-local calendar days near the boundary.
 */
export function resolveSlotsForPatientDay(
  doctor: Pick<Doctor, "availability" | "timezone">,
  patientDateISO: string,
  patientTimeZone: string,
): ResolvedSlot[] {
  const doctorTz = doctor.timezone || "UTC";
  const dayStartUtc = zonedTimeToUtc(patientDateISO, "00:00", patientTimeZone);
  const nextDayISO = format(addDays(parseISO(patientDateISO), 1), "yyyy-MM-dd");
  const dayEndUtc = zonedTimeToUtc(nextDayISO, "00:00", patientTimeZone);

  const candidateDates = new Set<string>([
    dateInZone(dayStartUtc, doctorTz),
    dateInZone(new Date(dayEndUtc.getTime() - 60_000), doctorTz),
  ]);

  const resolved: ResolvedSlot[] = [];
  candidateDates.forEach((doctorDateISO) => {
    const weekday = weekdayFromISO(doctorDateISO);
    const slots = doctor.availability?.[weekday] ?? [];
    slots.forEach((s) => {
      const startUtc = zonedTimeToUtc(doctorDateISO, s.start, doctorTz);
      const endUtc = zonedTimeToUtc(doctorDateISO, s.end, doctorTz);
      if (startUtc >= dayStartUtc && startUtc < dayEndUtc) {
        resolved.push({ slot: s, doctorDateISO, startUtc, endUtc });
      }
    });
  });
  resolved.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
  return resolved;
}

// ---- Appointment time window -------------------------------------------

/**
 * Build the real start/end instant for an appointment from its date + slot.
 * The date/slot are wall-clock times in the doctor's own timezone (snapshotted
 * on the appointment as `doctorTimezone`), so this always resolves to the same
 * absolute instant no matter which country the doctor or patient is browsing
 * from — critical for messaging/Meet windows to open at the same real moment
 * for both parties.
 */
export function appointmentWindow(appt: Appointment): { start: Date; end: Date } {
  const tz = appt.doctorTimezone || "UTC";
  const start = zonedTimeToUtc(appt.date, appt.slot.start, tz);
  const end = zonedTimeToUtc(appt.date, appt.slot.end, tz);
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
 * A patient can nudge their doctor for a Google Meet link only while the
 * appointment is live, settled, confirmed and doesn't already have a link
 * (and only once — no need to nudge again while a request is pending).
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
 * The doctor can send the Google Meet link any time during the live,
 * confirmed, settled appointment window, whether or not the patient asked.
 */
export function canShareMeet(appt: Appointment): boolean {
  return (
    appt.status === "confirmed" && !appt.meetLink && isAppointmentLive(appt)
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
