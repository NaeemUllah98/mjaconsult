import type { ReactNode } from "react";
import { Calendar, Clock, Video, Stethoscope, User } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatSlot } from "@/utils/format";
import { appointmentWindow } from "@/utils/appointment";
import {
  browserTimeZone,
  formatTimeInZone,
  formatDateInZone,
  zoneAbbreviation,
} from "@/utils/timezone";
import type { Appointment } from "@/types";

/** Whose perspective the card is shown from (controls which name is featured). */
type Perspective = "patient" | "doctor" | "admin";

export function AppointmentCard({
  appt,
  perspective,
  actions,
}: {
  appt: Appointment;
  perspective: Perspective;
  actions?: ReactNode;
}) {
  const showDoctor = perspective === "patient";
  const name = showDoctor ? appt.doctorName : appt.patientName;
  const sub = showDoctor
    ? appt.doctorSpecialization
    : perspective === "admin"
      ? `with ${appt.doctorName}`
      : "Patient";
  const photo = showDoctor ? appt.doctorPhotoURL : undefined;

  // The doctor already sees times in their own zone — no conversion needed.
  // Everyone else (patient, admin) is browsing from wherever they are, so
  // THEIR local date+time is what should read as the primary, prominent
  // values; the doctor's own wall-clock date+time is shown only as a small,
  // explicitly-zoned secondary line. A date-only conversion matters too, not
  // just time: near midnight, the doctor's own calendar day for a slot can
  // be a different date than the viewer's (see resolveSlotsForPatientDay).
  const viewerTz = browserTimeZone();
  const showLocalTime =
    perspective !== "doctor" &&
    (appt.doctorTimezone || "UTC") !== viewerTz;
  const doctorZoneAbbr = showLocalTime
    ? zoneAbbreviation(appointmentWindow(appt).start, appt.doctorTimezone || "UTC")
    : null;
  const localDate = showLocalTime
    ? formatDateInZone(appointmentWindow(appt).start, viewerTz)
    : null;
  const localRange = showLocalTime
    ? (() => {
        const { start, end } = appointmentWindow(appt);
        return `${formatTimeInZone(start, viewerTz)} – ${formatTimeInZone(end, viewerTz)}`;
      })()
    : null;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Avatar name={name} src={photo} size="md" />
          <div>
            <div className="flex items-center gap-2">
              {showDoctor ? (
                <Stethoscope className="h-4 w-4 text-brand-400" />
              ) : (
                <User className="h-4 w-4 text-brand-400" />
              )}
              <h3 className="font-display font-bold text-ink">{name}</h3>
            </div>
            <p className="text-sm text-ink-muted">{sub}</p>
          </div>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-subtle p-3 text-sm">
        <div className="flex items-center gap-2 text-ink-soft">
          <Calendar className="h-4 w-4 text-brand-400" />
          {showLocalTime ? localDate : formatDate(appt.date, "EEE, MMM d")}
        </div>
        <div className="flex items-center gap-2 text-ink-soft">
          <Clock className="h-4 w-4 text-brand-400" />
          {showLocalTime ? localRange : formatSlot(appt.slot)}
        </div>
        {showLocalTime && (
          <div className="col-span-2 text-xs text-ink-muted">
            {appt.doctorName}'s time: {formatDate(appt.date, "EEE, MMM d")},{" "}
            {formatSlot(appt.slot)} {doctorZoneAbbr}
          </div>
        )}
      </div>

      {appt.reason && (
        <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
          <span className="font-medium text-ink-soft">Reason:</span> {appt.reason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PaymentBadge status={appt.paymentStatus} />
        {appt.isFree && (
          <span className="text-xs font-semibold text-violet-600">
            Free campaign
          </span>
        )}
        {!appt.meetLink && appt.meetRequested && appt.status === "confirmed" && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
            <Video className="h-3.5 w-3.5" /> Meet link requested
          </span>
        )}
        {appt.meetLink && appt.status === "confirmed" && (
          <a href={appt.meetLink} target="_blank" rel="noreferrer" className="ml-auto">
            <Button size="sm" variant="secondary">
              <Video className="h-4 w-4" /> Join Meet
            </Button>
          </a>
        )}
      </div>

      {actions && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-muted pt-4">
          {actions}
        </div>
      )}
    </div>
  );
}
