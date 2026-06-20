import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div
          className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
            danger ? "bg-rose-50 text-rose-500" : "bg-brand-50 text-brand-500"
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
