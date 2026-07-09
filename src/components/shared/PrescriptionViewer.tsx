import { Printer, Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  PrescriptionDocument,
  PrescriptionPrintMount,
} from "@/components/shared/PrescriptionDocument";
import { printPrescription } from "@/lib/print";
import { formatDate } from "@/utils/format";
import type { Prescription } from "@/types";

/**
 * Read-only prescription viewer used by patients, doctors and admins. Shows the
 * letterhead exactly as issued and offers a native print → "Save as PDF" export.
 */
export function PrescriptionViewer({
  open,
  onClose,
  rx,
}: {
  open: boolean;
  onClose: () => void;
  rx: Prescription | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title="Prescription"
      description={
        rx
          ? `Issued by ${rx.doctorName} • ${formatDate(rx.date, "MMM d, yyyy")}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={printPrescription}>
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </>
      }
    >
      {rx && (
        <div className="space-y-3">
          <div className="mx-auto max-w-4xl">
            <PrescriptionDocument rx={rx} />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
            <Download className="h-3.5 w-3.5" />
            Tip: in the print dialog choose “Save as PDF” to download this
            prescription (page size is preset to 210 × 150 mm).
          </p>
          <PrescriptionPrintMount rx={rx} />
        </div>
      )}
    </Modal>
  );
}
