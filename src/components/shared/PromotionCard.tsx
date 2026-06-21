import type { ReactNode } from "react";
import { Gift, Sparkles, CalendarX, Ticket, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/utils/format";
import { discountLabel } from "@/utils/appointment";
import { optimized } from "@/lib/cloudinary";
import { cn } from "@/utils/cn";
import type { Promotion } from "@/types";

export function PromotionCard({
  promo,
  actions,
  onClaim,
  ctaLabel = "Claim this offer",
}: {
  promo: Promotion;
  actions?: ReactNode;
  /** When provided (patient view), the card becomes clickable to claim. */
  onClaim?: () => void;
  ctaLabel?: string;
}) {
  const isFree = promo.type === "free_campaign";
  const discount = discountLabel(promo);
  const clickable = !!onClaim;

  return (
    <div
      className={cn(
        "card group flex flex-col overflow-hidden p-0",
        clickable && "cursor-pointer transition hover:shadow-card",
      )}
      onClick={onClaim}
      role={clickable ? "button" : undefined}
    >
      <div className="relative">
        {promo.imageUrl ? (
          // object-contain shows the WHOLE poster (no cropping) on a soft bg.
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-brand-50 to-surface-subtle">
            <img
              src={optimized(promo.imageUrl, 800)}
              alt={promo.title}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex aspect-[16/9] items-center justify-center",
              isFree
                ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                : "bg-brand-gradient",
            )}
          >
            {isFree ? (
              <Sparkles className="h-12 w-12 text-white/90" />
            ) : (
              <Gift className="h-12 w-12 text-white/90" />
            )}
          </div>
        )}
        {discount && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs font-extrabold text-white shadow-glow">
            <Ticket className="h-3.5 w-3.5" /> {discount}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={isFree ? "purple" : "brand"} dot>
            {isFree ? "Free Consultation" : "Special Offer"}
          </Badge>
          {!promo.active && <Badge tone="gray">Inactive</Badge>}
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-ink">
          {promo.title}
        </h3>
        <p className="mt-1.5 flex-1 text-sm text-ink-muted">{promo.description}</p>
        {promo.expiresAt && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <CalendarX className="h-3.5 w-3.5" />
            Valid until {formatDate(promo.expiresAt)}
          </p>
        )}

        {clickable && (
          <Button
            className="mt-4"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onClaim?.();
            }}
          >
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {actions && (
          <div className="mt-4 flex gap-2 border-t border-surface-muted pt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
