import { format, parseISO, isValid } from "date-fns";
import type { FireDate, TimeSlot, Weekday } from "@/types";

export const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

/** Convert a Firestore Timestamp | Date | null to a JS Date. */
export function toDate(value: FireDate): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp has a toDate() method
  if (typeof (value as any).toDate === "function") {
    return (value as any).toDate();
  }
  return null;
}

export function formatDate(value: string | FireDate, fmt = "MMM d, yyyy"): string {
  let d: Date | null = null;
  if (typeof value === "string") {
    const parsed = parseISO(value);
    d = isValid(parsed) ? parsed : null;
  } else {
    d = toDate(value);
  }
  return d ? format(d, fmt) : "—";
}

export function formatTime(time: string): string {
  // "14:30" -> "2:30 PM"
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatSlot(slot: TimeSlot): string {
  return `${formatTime(slot.start)} – ${formatTime(slot.end)}`;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function weekdayFromISO(iso: string): Weekday {
  const d = parseISO(iso);
  return WEEKDAYS[d.getDay()];
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeTime(value: FireDate): string {
  const d = toDate(value);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return format(d, "MMM d");
}
