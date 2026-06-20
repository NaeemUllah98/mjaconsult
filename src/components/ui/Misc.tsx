import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-500", className)} />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink-muted">
        <div className="relative h-12 w-12">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-300" />
          <span className="absolute inset-0 grid place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          </span>
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-muted bg-surface-subtle px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  trend,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: "brand" | "green" | "amber" | "purple" | "blue";
  trend?: string;
}) {
  const tones = {
    brand: "from-brand-500 to-teal-500",
    green: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    purple: "from-violet-500 to-fuchsia-500",
    blue: "from-sky-500 to-blue-500",
  };
  return (
    <div className="card group relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-ink">
            {value}
          </p>
          {trend && <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>}
        </div>
        <div
          className={cn(
            "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-soft",
            tones[tone],
          )}
        >
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-50 opacity-0 transition-opacity group-hover:opacity-60" />
    </div>
  );
}
