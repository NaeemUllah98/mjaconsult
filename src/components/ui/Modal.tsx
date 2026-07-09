import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  footer?: ReactNode;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className={cn(
              "relative z-10 max-h-[90vh] w-full overflow-hidden rounded-2xl bg-surface shadow-card",
              sizes[size],
            )}
          >
            <div className="flex items-start justify-between border-b border-surface-muted px-6 py-4">
              <div>
                {title && (
                  <h3 className="font-display text-lg font-bold text-ink">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-6 py-5">
              {children}
            </div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-surface-muted bg-surface-subtle px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
