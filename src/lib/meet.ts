import { updateAppointment } from "./api";
import { notify } from "./notifications";
import { apptTimeLabel } from "@/utils/timezone";
import type { Appointment } from "@/types";

/**
 * Normalize a pasted meeting link, or return null if it isn't one.
 *
 * A strict `startsWith("http")` check on the raw paste is fragile: copying
 * from Google Meet's "New meeting" dialog, a mobile share sheet, or a chat
 * app frequently carries a stray leading/trailing space or newline, which
 * makes that check silently fail forever — the button just looks broken,
 * with no explanation. Trimming first fixes that. This also tolerates a link
 * pasted without its `https://` scheme (e.g. copied from a browser's address
 * bar display, which sometimes omits it).
 */
export function normalizeMeetUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

/**
 * A patient nudges their doctor to send the Google Meet link for a live
 * appointment. Flags the appointment and notifies the doctor directly —
 * doctors create and share their own Meet links (the admin no longer sits in
 * this path).
 */
export async function requestMeetLink(
  appt: Appointment,
  requesterName: string,
): Promise<void> {
  await updateAppointment(appt.id, {
    meetRequested: true,
    meetRequestedByName: requesterName,
  });

  // The recipient here is the doctor, so label the time in their own zone —
  // no separate "your time" conversion needed since it already is theirs.
  const doctorLabel = apptTimeLabel(
    appt.date,
    appt.slot.start,
    appt.doctorTimezone || "UTC",
  );
  await notify({
    userId: appt.doctorId,
    title: "Patient is waiting for the Meet link",
    body: `${requesterName} is ready for your ${doctorLabel} appointment. Send the Google Meet link from your Appointments page.`,
    type: "appointment",
    link: "/doctor/appointments",
    sendEmailToo: false,
  });
}

/**
 * The doctor (normally) or an admin (fallback) creates/pastes the Meet link
 * and shares it. Saves it on the appointment and notifies the patient — and
 * the doctor too, unless they're the one sharing it.
 */
export async function shareMeetLink(
  appt: Appointment,
  meetLink: string,
  sharedByDoctor = false,
): Promise<void> {
  await updateAppointment(appt.id, { meetLink, meetRequested: false });

  const doctorTz = appt.doctorTimezone || "UTC";
  // Always label the doctor's zone explicitly; convert to the patient's own
  // time too when we know it (snapshotted at booking time) so a patient in a
  // different country isn't left reading the doctor's local time as theirs.
  const patientLabel = apptTimeLabel(
    appt.date,
    appt.slot.start,
    doctorTz,
    appt.patientTimezone,
  );
  const doctorLabel = apptTimeLabel(appt.date, appt.slot.start, doctorTz);

  const notifications = [
    notify({
      userId: appt.patientId,
      email: appt.patientEmail,
      name: appt.patientName,
      title: "Your Google Meet link is ready",
      body: `Your Google Meet link for ${patientLabel} is ready: ${meetLink}`,
      type: "appointment",
      sendEmailToo: true,
    }),
  ];
  if (!sharedByDoctor) {
    notifications.push(
      notify({
        userId: appt.doctorId,
        title: "Google Meet link shared",
        body: `Your Google Meet link for ${doctorLabel} is ready: ${meetLink}`,
        type: "appointment",
        sendEmailToo: false,
      }),
    );
  }
  await Promise.all(notifications);
}
