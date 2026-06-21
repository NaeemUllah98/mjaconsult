import { useMemo, useState } from "react";
import { Megaphone, Stethoscope, ArrowRight } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { listPromotions, listDoctors } from "@/lib/api";
import { promoApplies, computePromoFee } from "@/utils/appointment";
import { PageHeader } from "@/components/shared/PageHeader";
import { PromotionCard } from "@/components/shared/PromotionCard";
import { BookingModal } from "@/components/shared/BookingModal";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import { formatCurrency } from "@/utils/format";
import type { Doctor, Promotion } from "@/types";

export default function PatientPromotions() {
  const { data: promos, loading } = useAsync(() => listPromotions(true), []);
  const { data: doctors } = useAsync(() => listDoctors(true), []);
  const [claiming, setClaiming] = useState<Promotion | null>(null);
  const [bookDoctor, setBookDoctor] = useState<Doctor | null>(null);
  const [bookPromo, setBookPromo] = useState<Promotion | null>(null);

  const eligibleDoctors = useMemo(() => {
    if (!claiming) return [];
    return (doctors ?? []).filter((d) => promoApplies(claiming, d.uid));
  }, [claiming, doctors]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Offers & free campaigns"
        subtitle="Tap an offer to book a discounted or free consultation."
      />
      {!promos || promos.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No active offers right now"
          description="Check back soon — new promotions are announced here."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((p) => (
            <PromotionCard
              key={p.id}
              promo={p}
              onClaim={() => setClaiming(p)}
            />
          ))}
        </div>
      )}

      {/* Choose an eligible doctor to claim the offer with */}
      <Modal
        open={!!claiming}
        onClose={() => setClaiming(null)}
        title={claiming?.title ?? "Claim offer"}
        description="Choose a doctor to book with this offer applied."
        size="lg"
      >
        {eligibleDoctors.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="h-6 w-6" />}
            title="No doctors available for this offer"
            description="Please check back later or browse all doctors."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-2">
            {eligibleDoctors.map((d) => {
              const newFee = computePromoFee(d.fees, claiming);
              return (
                <button
                  key={d.uid}
                  onClick={() => {
                    setBookDoctor(d);
                    setBookPromo(claiming);
                    setClaiming(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-surface-muted p-3 text-left transition hover:border-brand-300 hover:bg-surface-subtle"
                >
                  <Avatar name={d.name} src={d.photoURL} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{d.name}</p>
                    <p className="truncate text-sm text-brand-600">
                      {d.specialization}
                    </p>
                  </div>
                  <div className="text-right">
                    {newFee < d.fees && (
                      <p className="text-xs text-ink-muted line-through">
                        {formatCurrency(d.fees, d.currency ?? "USD")}
                      </p>
                    )}
                    <Badge tone={newFee === 0 ? "purple" : "green"}>
                      {newFee === 0
                        ? "FREE"
                        : formatCurrency(newFee, d.currency ?? "USD")}
                    </Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-muted" />
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      {bookDoctor && (
        <BookingModal
          doctor={bookDoctor}
          promo={bookPromo ?? undefined}
          open={!!bookDoctor}
          onClose={() => {
            setBookDoctor(null);
            setBookPromo(null);
          }}
        />
      )}
    </div>
  );
}
