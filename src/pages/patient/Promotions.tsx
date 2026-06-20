import { Megaphone } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { listPromotions } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PromotionCard } from "@/components/shared/PromotionCard";
import { PageLoader, EmptyState } from "@/components/ui/Misc";

export default function PatientPromotions() {
  const { data: promos, loading } = useAsync(() => listPromotions(true), []);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Offers & free campaigns"
        subtitle="Special promotions and free-consultation announcements from MJACONSULT."
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
            <PromotionCard key={p.id} promo={p} />
          ))}
        </div>
      )}
    </div>
  );
}
