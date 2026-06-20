import { listAdmins, updateAppointment } from "./api";
import { notify } from "./notifications";
import { formatDate, formatTime } from "@/utils/format";
import type { Appointment } from "@/types";

/**
 * A doctor or patient asks the admin to create the Google Meet link for an
 * appointment. Flags the appointment and notifies every admin.
 */
export async function requestMeetLink(
  appt: Appointment,
  requesterName: string,
): Promise<void> {
  await updateAppointment(appt.id, {
    meetRequested: true,
    meetRequestedByName: requesterName,
  });

  const admins = await listAdmins();
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.uid,
        email: a.email,
        name: a.name,
        title: "Google Meet link requested",
        body: `${requesterName} requested a Meet link for the ${formatDate(
          appt.date,
        )} at ${formatTime(appt.slot.start)} appointment (${appt.doctorName} & ${appt.patientName}).`,
        type: "appointment",
        link: "/admin/appointments",
        sendEmailToo: true,
      }),
    ),
  );
}

/**
 * Admin creates/pastes the Meet link and shares it. Saves it on the
 * appointment and notifies BOTH the patient and the doctor so all three
 * (admin included) can join the same call.
 */
export async function shareMeetLink(
  appt: Appointment,
  meetLink: string,
): Promise<void> {
  await updateAppointment(appt.id, { meetLink, meetRequested: false });

  const body = `Your Google Meet link for ${formatDate(appt.date)} at ${formatTime(
    appt.slot.start,
  )} is ready: ${meetLink}`;

  await Promise.all([
    notify({
      userId: appt.patientId,
      email: appt.patientEmail,
      name: appt.patientName,
      title: "Your Google Meet link is ready",
      body,
      type: "appointment",
      sendEmailToo: true,
    }),
    notify({
      userId: appt.doctorId,
      title: "Google Meet link shared",
      body,
      type: "appointment",
      sendEmailToo: false,
    }),
  ]);
}
