import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Search,
  Video,
  CalendarClock,
  Receipt,
  BadgeCheck,
  XCircle,
  Wallet,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAsync } from "@/hooks/useAsync";
import {
  listAllAppointments,
  updateAppointment,
  listAllPrescriptions,
} from "@/lib/api";
import { shareMeetLink } from "@/lib/meet";
import { notify } from "@/lib/notifications";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { PrescriptionViewer } from "@/components/shared/PrescriptionViewer";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatCard, PageLoader, EmptyState } from "@/components/ui/Misc";
import type { Appointment, Prescription } from "@/types";

type View = "all" | "payments" | "meets";

export default function AdminAppointments() {
  const { data, loading, reload } = useAsync(() => listAllAppointments(), []);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("all");
  const [meetFor, setMeetFor] = useState<Appointment | null>(null);
  const [meetUrl, setMeetUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // All issued prescriptions, keyed by appointment id.
  const [rxMap, setRxMap] = useState<Record<string, Prescription>>({});
  useEffect(() => {
    listAllPrescriptions().then((list) => {
      const m: Record<string, Prescription> = {};
      list.forEach((p) => (m[p.appointmentId] = p));
      setRxMap(m);
    });
  }, []);
  const [viewing, setViewing] = useState<Prescription | null>(null);

  const pendingPayments = useMemo(
    () => (data ?? []).filter((a) => a.paymentStatus === "proof_submitted"),
    [data],
  );
  const pendingMeets = useMemo(
    () => (data ?? []).filter((a) => a.meetRequested && !a.meetLink),
    [data],
  );

  const filtered = useMemo(
    () =>
      (data ?? []).filter((a) => {
        const matchesQ =
          !q ||
          a.patientName.toLowerCase().includes(q.toLowerCase()) ||
          a.doctorName.toLowerCase().includes(q.toLowerCase());
        const matchesView =
          view === "all"
            ? true
            : view === "payments"
              ? a.paymentStatus === "proof_submitted"
              : a.meetRequested && !a.meetLink;
        return matchesQ && matchesView;
      }),
    [data, q, view],
  );

  async function reviewPayment(a: Appointment, approve: boolean) {
    setBusyId(a.id);
    try {
      await updateAppointment(a.id, {
        paymentStatus: approve ? "verified" : "rejected",
        // Verifying payment confirms the slot for the patient.
        ...(approve ? { status: "confirmed" as const } : {}),
      });
      await notify({
        userId: a.patientId,
        email: a.patientEmail,
        name: a.patientName,
        title: approve ? "Slot confirmed ✅" : "Payment rejected",
        body: approve
          ? `Your payment for the ${a.date} appointment was approved and your slot is now confirmed. You can message your doctor and request a Meet link during the appointment.`
          : `Your payment proof for ${a.date} was rejected. Please re-upload a valid proof.`,
        type: "payment",
        sendEmailToo: true,
      });
      if (approve) {
        await notify({
          userId: a.doctorId,
          title: "Payment verified",
          body: `Payment for ${a.patientName}'s ${a.date} appointment is verified.`,
          type: "payment",
        });
      }
      toast.success(approve ? "Payment approved" : "Payment rejected");
      reload();
    } catch {
      toast.error("Could not update payment. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function share() {
    if (!meetFor || !meetUrl.startsWith("http")) return;
    setBusy(true);
    try {
      await shareMeetLink(meetFor, meetUrl.trim());
      toast.success("Meet link shared with the doctor and patient");
      setMeetFor(null);
      setMeetUrl("");
      reload();
    } catch {
      toast.error("Could not share the link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;

  const tabs: { key: View; label: string; badge?: number }[] = [
    { key: "all", label: "All" },
    { key: "payments", label: "Payment reviews", badge: pendingPayments.length },
    { key: "meets", label: "Meet requests", badge: pendingMeets.length },
  ];

  return (
    <div>
      <PageHeader
        title="All appointments"
        subtitle="Approve payments, create Meet links, and monitor every booking."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={data?.length ?? 0} icon={<CalendarClock className="h-5 w-5" />} tone="brand" />
        <StatCard label="Confirmed" value={(data ?? []).filter((a) => a.status === "confirmed").length} icon={<CalendarCheck className="h-5 w-5" />} tone="green" />
        <StatCard label="Payment reviews" value={pendingPayments.length} icon={<Wallet className="h-5 w-5" />} tone="amber" />
        <StatCard label="Meet requests" value={pendingMeets.length} icon={<Video className="h-5 w-5" />} tone="purple" />
      </div>

      {/* Alerts */}
      {pendingPayments.length > 0 && view === "all" && (
        <AlertBanner
          tone="amber"
          icon={<Wallet className="h-6 w-6 text-amber-500" />}
          title={`${pendingPayments.length} payment${pendingPayments.length > 1 ? "s" : ""} awaiting review`}
          body="Patients uploaded payment proof. Approve or reject to unlock messaging & Meet links."
          actionLabel="Review payments"
          onAction={() => setView("payments")}
        />
      )}
      {pendingMeets.length > 0 && view === "all" && (
        <AlertBanner
          tone="violet"
          icon={<Video className="h-6 w-6 text-violet-500" />}
          title={`${pendingMeets.length} Meet link${pendingMeets.length > 1 ? "s" : ""} requested`}
          body="A patient is waiting on their doctor for a Google Meet link. Doctors send these themselves — step in here only if one needs help."
          actionLabel="View requests"
          onAction={() => setView("meets")}
        />
      )}

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === t.key
                  ? "bg-surface text-brand-700 shadow-soft"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <Input
            placeholder="Search by patient or doctor…"
            icon={<Search className="h-4 w-4" />}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" />}
          title={
            view === "payments"
              ? "No payments to review"
              : view === "meets"
                ? "No pending Meet requests"
                : "No appointments found"
          }
          description="Items needing your attention will appear here."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              perspective="admin"
              actions={
                <>
                  {a.paymentStatus === "proof_submitted" && (
                    <>
                      <a href={a.paymentProofUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">
                          <Receipt className="h-4 w-4" /> View proof
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        loading={busyId === a.id}
                        onClick={() => reviewPayment(a, true)}
                      >
                        <BadgeCheck className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:bg-rose-50"
                        onClick={() => reviewPayment(a, false)}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </>
                  )}
                  {a.meetRequested && !a.meetLink && a.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMeetFor(a);
                        setMeetUrl("");
                      }}
                    >
                      <Video className="h-4 w-4" /> Help — create &amp; share link
                    </Button>
                  )}
                  {rxMap[a.id] && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewing(rxMap[a.id])}
                    >
                      <FileText className="h-4 w-4" /> Prescription
                    </Button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}

      {/* Create & share Meet link modal */}
      <Modal
        open={!!meetFor}
        onClose={() => setMeetFor(null)}
        title="Create & share Google Meet link"
        description={
          meetFor
            ? `Backup path — normally ${meetFor.doctorName} sends this themselves. For ${meetFor.doctorName} & ${meetFor.patientName}; both will be notified.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setMeetFor(null)}>
              Cancel
            </Button>
            <Button onClick={share} disabled={!meetUrl.startsWith("http")} loading={busy}>
              Share with both
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <a href="https://meet.google.com/new" target="_blank" rel="noreferrer">
            <Button variant="subtle" fullWidth>
              <Video className="h-4 w-4" /> Open meet.google.com/new to create a link
            </Button>
          </a>
          <Input
            label="Paste the Google Meet link"
            placeholder="https://meet.google.com/abc-defg-hij"
            value={meetUrl}
            onChange={(e) => setMeetUrl(e.target.value)}
            icon={<Video className="h-4 w-4" />}
          />
          <p className="text-xs text-ink-muted">
            Create the meeting in your Google account, then paste the link here.
            The same link goes to the doctor and patient — all three of you can
            join the same call.
          </p>
        </div>
      </Modal>

      <PrescriptionViewer
        open={!!viewing}
        onClose={() => setViewing(null)}
        rx={viewing}
      />
    </div>
  );
}

function AlertBanner({
  tone,
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  tone: "amber" | "violet";
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  };
  return (
    <div className={`mb-4 flex items-center gap-4 rounded-2xl border p-4 ${tones[tone]}`}>
      {icon}
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-80">{body}</p>
      </div>
      <Button size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
