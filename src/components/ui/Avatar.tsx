import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";
import { optimized } from "@/lib/cloudinary";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({
  name,
  src,
  size = "md",
  className,
  ring,
}: {
  name?: string;
  src?: string;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient font-semibold text-white",
        sizes[size],
        ring && "ring-2 ring-white ring-offset-2 ring-offset-surface-subtle",
        className,
      )}
    >
      {src ? (
        <img
          src={optimized(src, 200)}
          alt={name ?? "avatar"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
