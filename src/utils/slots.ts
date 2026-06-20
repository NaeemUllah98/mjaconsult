import type { TimeSlot } from "@/types";

/** "09:00" -> minutes since midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** minutes -> "HH:mm". */
export function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generate consecutive slots between a start and end time.
 * e.g. generateSlots("09:00","12:00",30) -> 09:00–09:30, 09:30–10:00, …
 */
export function generateSlots(
  start: string,
  end: string,
  durationMins: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let cursor = toMinutes(start);
  const endM = toMinutes(end);
  while (cursor + durationMins <= endM) {
    slots.push({ start: toHHMM(cursor), end: toHHMM(cursor + durationMins) });
    cursor += durationMins;
  }
  return slots;
}
