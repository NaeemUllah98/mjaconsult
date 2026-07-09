import { FileText, Calendar, Pill, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/utils/format";
import type { Prescription } from "@/types";

/** A summary card for a single prescription, used in the list pages. */
export function PrescriptionCard({
  rx,
  perspective,
  onView,
}: {
  rx: Prescription;
  perspective: "patient" | "doctor" | "admin";
  onView: () => void;
}) {
  const medCount = rx.medicines?.filter((m) => m.name?.trim()).length ?? 0;
  const title = perspective === "patient" ? rx.doctorName : rx.patientName;
  const sub =
    perspective === "patient"
      ? rx.doctorSpecialization || "Prescription"
      : `Issued by ${rx.doctorName}`;

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-display font-bold text-ink">{title}</h3>
          <p className="truncate text-sm text-ink-muted">{sub}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-subtle p-3 text-sm">
        <div className="flex items-center gap-2 text-ink-soft">
          <Calendar className="h-4 w-4 text-brand-400" />
          {formatDate(rx.date, "MMM d, yyyy")}
        </div>
        <div className="flex items-center gap-2 text-ink-soft">
          <Pill className="h-4 w-4 text-brand-400" />
          {medCount} medicine{medCount === 1 ? "" : "s"}
        </div>
      </div>

      {rx.diagnosis && (
        <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
          <span className="font-medium text-ink-soft">Diagnosis:</span>{" "}
          {rx.diagnosis}
        </p>
      )}

      <div className="mt-4 border-t border-surface-muted pt-4">
        <Button size="sm" variant="secondary" onClick={onView}>
          <Eye className="h-4 w-4" /> View &amp; download
        </Button>
      </div>
    </div>
  );
}
