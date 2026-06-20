import { cn } from "@/utils/cn";
import logo from "@/assets/logo.png";

export function Logo({
  className,
  showText = true,
  textClassName,
}: {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={logo}
        alt="MJACONSULT"
        className={cn("h-20 w-20 object-contain", className)}
      />
      {showText && (
        <div className="leading-none">
          <span
            className={cn(
              "block font-display text-lg font-extrabold tracking-tight text-brand-900",
              textClassName,
            )}
          >
            MJA<span className="text-teal-500">CONSULT</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Online Health Care
          </span>
        </div>
      )}
    </div>
  );
}
