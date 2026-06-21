import { useState } from "react";
import {
  Download,
  Users,
  Stethoscope,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  listPatients,
  listDoctors,
  listAllAppointments,
  listPromotions,
} from "@/lib/api";
import {
  exportPatients,
  exportDoctors,
  exportAll,
} from "@/lib/export";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Kind = "patients" | "doctors" | "all";

const cards: {
  kind: Kind;
  title: string;
  description: string;
  icon: typeof Users;
  tone: string;
}[] = [
  {
    kind: "patients",
    title: "Patient data",
    description: "All registered patients with contact details and status.",
    icon: Users,
    tone: "from-sky-500 to-blue-500",
  },
  {
    kind: "doctors",
    title: "Doctor data",
    description: "Every doctor profile — specialization, fees, experience.",
    icon: Stethoscope,
    tone: "from-brand-500 to-teal-500",
  },
  {
    kind: "all",
    title: "Whole hospital data",
    description:
      "One workbook with separate titled sheets: Patients, Doctors, Appointments, Promotions.",
    icon: Building2,
    tone: "from-violet-500 to-fuchsia-500",
  },
];

export default function AdminDataExport() {
  const [busy, setBusy] = useState<Kind | null>(null);

  async function run(kind: Kind) {
    setBusy(kind);
    try {
      if (kind === "patients") {
        exportPatients(await listPatients());
      } else if (kind === "doctors") {
        exportDoctors(await listDoctors());
      } else {
        const [patients, doctors, appointments, promotions] = await Promise.all([
          listPatients(),
          listDoctors(),
          listAllAppointments(),
          listPromotions(),
        ]);
        exportAll({ patients, doctors, appointments, promotions });
      }
      toast.success("Excel file downloaded");
    } catch {
      toast.error("Could not generate the export. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Data export"
        subtitle="Download platform records as Excel (.xlsx) workbooks with titled sheets."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.kind} className="flex flex-col">
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${c.tone} text-white shadow-soft`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">
                {c.title}
              </h3>
              <p className="mt-1 flex-1 text-sm text-ink-muted">
                {c.description}
              </p>
              <Button
                className="mt-5"
                fullWidth
                loading={busy === c.kind}
                onClick={() => run(c.kind)}
              >
                <Download className="h-4 w-4" /> Download Excel
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-surface-muted bg-surface-subtle p-4 text-sm text-ink-muted">
        <FileSpreadsheet className="h-5 w-5 text-brand-500" />
        Files open directly in Microsoft Excel, Google Sheets or Numbers. Each
        sheet starts with a title row followed by column headers.
      </div>
    </div>
  );
}
