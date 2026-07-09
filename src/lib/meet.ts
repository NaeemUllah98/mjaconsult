import { updateAppointment } from "./api";
import { notify } from "./notifications";
import { formatDate, formatTime } from "@/utils/format";
import type { Appointment } from "@/types";

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

  await notify({
    userId: appt.doctorId,
    title: "Patient is waiting for the Meet link",
    body: `${requesterName} is ready for your ${formatDate(appt.date)} at ${formatTime(
      appt.slot.start,
    )} appointment. Send the Google Meet link from your Appointments page.`,
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

  const body = `Your Google Meet link for ${formatDate(appt.date)} at ${formatTime(
    appt.slot.start,
  )} is ready: ${meetLink}`;

  const notifications = [
    notify({
      userId: appt.patientId,
      email: appt.patientEmail,
      name: appt.patientName,
      title: "Your Google Meet link is ready",
      body,
      type: "appointment",
      sendEmailToo: true,
    }),
  ];
  if (!sharedByDoctor) {
    notifications.push(
      notify({
        userId: appt.doctorId,
        title: "Google Meet link shared",
        body,
        type: "appointment",
        sendEmailToo: false,
      }),
    );
  }
  await Promise.all(notifications);
}
