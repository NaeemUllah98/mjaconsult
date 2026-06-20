import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import type { AppointmentStatus, PaymentStatus } from "@/types";

type Tone =
  | "brand"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "gray"
  | "purple";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  children,
  tone = "brand",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const statusTone: Record<AppointmentStatus, Tone> = {
  pending: "amber",
  confirmed: "green",
  completed: "blue",
  cancelled: "red",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge tone={statusTone[status]} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

const paymentTone: Record<PaymentStatus, Tone> = {
  unpaid: "gray",
  proof_submitted: "amber",
  verified: "green",
  rejected: "red",
  free: "purple",
};

const paymentLabel: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  proof_submitted: "Proof submitted",
  verified: "Verified",
  rejected: "Rejected",
  free: "Free",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTone[status]}>{paymentLabel[status]}</Badge>;
}
