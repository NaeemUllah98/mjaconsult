import { useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { listPrescriptionsFor } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrescriptionCard } from "@/components/shared/PrescriptionCard";
import { PrescriptionViewer } from "@/components/shared/PrescriptionViewer";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import type { Prescription } from "@/types";

export default function PatientPrescriptions() {
  const { user } = useAuth();
  const { data, loading } = useAsync(
    () => listPrescriptionsFor("patientId", user!.uid),
    [user?.uid],
  );
  const [viewing, setViewing] = useState<Prescription | null>(null);

  if (loading) return <PageLoader />;
  const items = data ?? [];

  return (
    <div>
      <PageHeader
        title="My prescriptions"
        subtitle="View and download the prescriptions your doctors have issued."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No prescriptions yet"
          description="When a doctor issues you a prescription after a consultation, it will appear here to view and download as a PDF."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {items.map((rx) => (
            <PrescriptionCard
              key={rx.id}
              rx={rx}
              perspective="patient"
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
