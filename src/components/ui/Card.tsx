import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card p-5 sm:p-6",
        hover &&
          "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </span>
        )}
        <div>
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
