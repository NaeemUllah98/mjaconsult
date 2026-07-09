import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { listAllPrescriptions } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrescriptionCard } from "@/components/shared/PrescriptionCard";
import { PrescriptionViewer } from "@/components/shared/PrescriptionViewer";
import { Input } from "@/components/ui/Input";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import type { Prescription } from "@/types";

export default function AdminPrescriptions() {
  const { data, loading } = useAsync(() => listAllPrescriptions(), []);
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Prescription | null>(null);

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (p) =>
          !q ||
          p.patientName.toLowerCase().includes(q.toLowerCase()) ||
          p.doctorName.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q],
  );

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        subtitle="Every prescription issued across the platform, with the doctor and company stamps."
      />

      <div className="card mb-6 p-4">
        <Input
          placeholder="Search by patient or doctor…"
          icon={<Search className="h-4 w-4" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No prescriptions found"
          description="Prescriptions that doctors issue to patients will appear here."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((rx) => (
            <PrescriptionCard
              key={rx.id}
              rx={rx}
              perspective="admin"
              onView={() => setViewing(rx)}
            />
          ))}
        </div>
      )}

      <PrescriptionViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        rx={viewing}
      />
    </div>
  );
}
