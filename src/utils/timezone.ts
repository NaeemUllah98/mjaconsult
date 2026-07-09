/**
 * Timezone-aware slot handling.
 *
 * Doctors set availability as wall-clock times ("16:00") which are meaningful
 * only relative to the doctor's own timezone. Without knowing that timezone,
 * a patient in a different part of the world would see (and the app would
 * enforce messaging/Meet windows against) the wrong absolute instant — e.g. a
 * 4pm PKT slot silently treated as 4pm in the patient's own local time.
 *
 * Every doctor stores an IANA timezone (`Doctor.timezone`). It's snapshotted
 * onto each appointment at booking time (`Appointment.doctorTimezone`) so the
 * meaning of a booking's date+slot never drifts even if the doctor later
 * changes their profile timezone.
 */

/** The browser's own IANA timezone, e.g. "Asia/Karachi". */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** A reasonably complete list of IANA timezones for a picker dropdown. */
export function listTimeZones(): string[] {
  try {
    // Supported in all evergreen browsers; falls back below if missing.
    const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    const zones = anyIntl.supportedValuesOf?.("timeZone");
    if (zones?.length) return zones;
  } catch {
    /* fall through to the curated list */
  }
  return COMMON_TIME_ZONES;
}

const COMMON_TIME_ZONES = [
  "UTC",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Asia/Istanbul",
  "Asia/Jakarta",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/**
 * Convert a wall-clock "HH:mm" on a "yyyy-MM-dd" date, meant in `timeZone`,
 * into the actual UTC instant it refers to. Handles DST correctly.
 */
export function zonedTimeToUtc(
  dateISO: string,
  time: string,
  timeZone: string,
): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  // Target: the desired wall-clock reading, expressed as a UTC-numbered
  // instant purely so we can do arithmetic on it (it is NOT the answer).
  const target = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);

  // Fixed-point search: at a candidate instant, measure how far ahead of UTC
  // the zone's wall clock reads (its offset), then re-derive the candidate as
  // target-minus-offset. Converges in one extra pass except right at a DST
  // transition, where two passes settle it.
  let result = target;
  for (let i = 0; i < 2; i++) {
    const seenInZone = wallClockPartsInZone(new Date(result), timeZone);
    const seenAsUtc = Date.UTC(
      seenInZone.year,
      seenInZone.month - 1,
      seenInZone.day,
      seenInZone.hour,
      seenInZone.minute,
      seenInZone.second,
    );
    const offset = seenAsUtc - result;
    const next = target - offset;
    if (next === result) break;
    result = next;
  }
  return new Date(result);
}

function wallClockPartsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => (map[p.type] = p.value));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Format a UTC instant as "H:mm AM/PM" in the given IANA timezone. */
export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Format a UTC instant as "EEE, MMM d" in the given IANA timezone. */
export function formatDateInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Short zone label for a UTC instant, e.g. "PKT" or "GMT+5". */
export function zoneAbbreviation(date: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}
