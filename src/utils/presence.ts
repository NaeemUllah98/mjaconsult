import { toDate, WEEKDAYS } from "@/utils/format";
import type { Doctor } from "@/types";

/** A heartbeat older than this counts as offline (covers crashed tabs). */
const ONLINE_WINDOW_MS = 3 * 60_000;

/** True when the doctor's presence heartbeat is recent. */
export function isDoctorOnline(doctor: Doctor, now = Date.now()): boolean {
  if (!doctor.online) return false;
  const seen = toDate(doctor.lastSeenAt ?? null);
  return !!seen && now - seen.getTime() < ONLINE_WINDOW_MS;
}

/** True when the current time falls inside the doctor's scheduled hours today. */
export function isOnDutyNow(doctor: Doctor, when = new Date()): boolean {
  const weekday = WEEKDAYS[when.getDay()];
  const slots = doctor.availability?.[weekday] ?? [];
  if (slots.length === 0) return false;
  const mins = when.getHours() * 60 + when.getMinutes();
  return slots.some((s) => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return mins >= sh * 60 + sm && mins <= eh * 60 + em;
  });
}
