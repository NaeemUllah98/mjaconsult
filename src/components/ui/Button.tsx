import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "btn-shine bg-brand-gradient text-white shadow-glow hover:shadow-glow-teal hover:brightness-[1.05]",
  secondary:
    "bg-brand-500 text-white hover:bg-brand-600 shadow-soft",
  outline:
    "border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 hover:border-brand-300",
  ghost: "text-ink-soft hover:bg-surface-muted hover:text-ink",
  danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-soft",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2.5",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100",
        "disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
