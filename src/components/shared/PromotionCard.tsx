import type { ReactNode } from "react";
import { Gift, Sparkles, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/utils/format";
import { optimized } from "@/lib/cloudinary";
import type { Promotion } from "@/types";

export function PromotionCard({
  promo,
  actions,
}: {
  promo: Promotion;
  actions?: ReactNode;
}) {
  const isFree = promo.type === "free_campaign";
  return (
    <div className="card overflow-hidden p-0">
      {promo.imageUrl ? (
        <img
          src={optimized(promo.imageUrl, 600)}
          alt={promo.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-32 items-center justify-center ${
            isFree
              ? "bg-gradient-to-br from-violet-500 to-fuchsia-500"
              : "bg-brand-gradient"
          }`}
        >
          {isFree ? (
            <Sparkles className="h-12 w-12 text-white/90" />
          ) : (
            <Gift className="h-12 w-12 text-white/90" />
          )}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge tone={isFree ? "purple" : "brand"} dot>
            {isFree ? "Free Consultation" : "Special Offer"}
          </Badge>
          {!promo.active && <Badge tone="gray">Inactive</Badge>}
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-ink">
          {promo.title}
        </h3>
        <p className="mt-1.5 text-sm text-ink-muted">{promo.description}</p>
        {promo.expiresAt && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <CalendarX className="h-3.5 w-3.5" />
            Valid until {formatDate(promo.expiresAt)}
          </p>
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
