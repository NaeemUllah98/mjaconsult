import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Upload,
  XCircle,
  Receipt,
  Video,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import {
  listAppointmentsFor,
  cancelAppointment,
  updateAppointment,
  listAdmins,
  getPaymentSettings,
} from "@/lib/api";
import { ensureThread } from "@/lib/chat";
import { PaymentInfo } from "@/components/shared/PaymentInfo";
import { notify } from "@/lib/notifications";
import { requestMeetLink } from "@/lib/meet";
import { isPaid, canRequestMeet, canMessage } from "@/utils/appointment";
import { formatCurrency } from "@/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import { isAfter, parseISO, startOfToday } from "date-fns";
import type { Appointment } from "@/types";

type Tab = "upcoming" | "past" | "all";

export default function PatientAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(
    () => listAppointmentsFor("patientId", user!.uid),
    [user?.uid],
  );
  const { data: paySettings } = useAsync(() => getPaymentSettings(), []);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [payFor, setPayFor] = useState<Appointment | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [cancelFor, setCancelFor] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const appts = data ?? [];
    if (tab === "all") return appts;
    const today = startOfToday();
    if (tab === "upcoming")
      return appts.filter(
        (a) => a.status !== "cancelled" && isAfter(parseISO(a.date), today),
      );
    return appts.filter(
      (a) => a.status === "completed" || !isAfter(parseISO(a.date), today),
    );
  }, [data, tab]);

  async function submitProof() {
    if (!payFor || !proofUrl) return;
    setBusy(true);
    try {
      await updateAppointment(payFor.id, {
        paymentProofUrl: proofUrl,
        paymentStatus: "proof_submitted",
      });
      // Notify the admins (they review payments).
      const admins = await listAdmins();
      await Promise.all(
        admins.map((a) =>
          notify({
            userId: a.uid,
            email: a.email,
            name: a.name,
            title: "Payment proof submitted",
            body: `${user?.name} uploaded payment proof for ${payFor.date} — review needed.`,
            type: "payment",
            link: "/admin/appointments",
            sendEmailToo: true,
          }),
        ),
      );
      toast.success("Payment proof submitted for verification");
      setPayFor(null);
      setProofUrl("");
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function askForMeet(appt: Appointment) {
    setBusy(true);
    try {
      await requestMeetLink(appt, user!.name);
      toast.success("Meet link requested — the admin will share it shortly");
      reload();
    } catch {
      toast.error("Could not send request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function messageDoctor(appt: Appointment) {
    await ensureThread({
      patientId: user!.uid,
      doctorId: appt.doctorId,
      patientName: user!.name,
      doctorName: appt.doctorName,
      patientPhotoURL: user!.photoURL,
      doctorPhotoURL: appt.doctorPhotoURL,
    });
    navigate("/patient/chat");
  }

  async function doCancel() {
    if (!cancelFor) return;
    setBusy(true);
    try {
      await cancelAppointment(cancelFor);
      await notify({
        userId: cancelFor.doctorId,
        title: "Appointment cancelled",
        body: `${user?.name} cancelled the ${cancelFor.date} appointment.`,
        type: "appointment",
      });
      toast.success("Appointment cancelled");
      setCancelFor(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="My appointments"
        subtitle="Track, pay for and manage your consultations."
        action={
          <Link to="/patient/doctors">
            <Button>Book new</Button>
          </Link>
        }
      />

      <div className="mb-6 inline-flex rounded-xl bg-surface-muted p-1">
        {(["upcoming", "past", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-surface text-brand-700 shadow-soft"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" />}
          title="Nothing here yet"
          description="Your appointments will show up here once you book."
          action={
            <Link to="/patient/doctors">
              <Button>Find a doctor</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              perspective="patient"
              actions={
                <>
                  {!appt.isFree &&
                    ["unpaid", "rejected"].includes(appt.paymentStatus) &&
                    appt.status !== "cancelled" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPayFor(appt);
                          setProofUrl(appt.paymentProofUrl ?? "");
                        }}
                      >
                        <Upload className="h-4 w-4" /> Upload payment
                      </Button>
                    )}
                  {appt.paymentProofUrl && (
                    <a
                      href={appt.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="ghost">
                        <Receipt className="h-4 w-4" /> View proof
                      </Button>
                    </a>
                  )}
                  {canMessage(appt) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => messageDoctor(appt)}
                    >
                      <MessageSquare className="h-4 w-4" /> Message doctor
                    </Button>
                  )}
                  {canRequestMeet(appt) && (
                    <Button size="sm" onClick={() => askForMeet(appt)}>
                      <Video className="h-4 w-4" /> Request Meet link
                    </Button>
                  )}
                  {appt.paymentStatus === "proof_submitted" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <Receipt className="h-3.5 w-3.5" /> Payment under review —
                      your slot will be confirmed once verified
                    </span>
                  )}
                  {isPaid(appt) && appt.status !== "cancelled" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                      <MessageSquare className="h-3.5 w-3.5" /> Messaging &amp;
                      Meet link open during your appointment slot
                    </span>
                  )}
                  {appt.status !== "cancelled" &&
                    appt.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:bg-rose-50"
                        onClick={() => setCancelFor(appt)}
                      >
                        <XCircle className="h-4 w-4" /> Cancel
                      </Button>
                    )}
                </>
              }
            />
          ))}
        </div>
      )}

      {/* Payment proof modal */}
      <Modal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        title="Upload payment proof"
        description="Upload a screenshot of your payment. Our team will verify it shortly."
        footer={
          <>
            <Button variant="outline" onClick={() => setPayFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitProof} disabled={!proofUrl} loading={busy}>
              Submit for verification
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {payFor && !payFor.isFree && (
            <div className="flex items-center justify-between rounded-xl bg-brand-gradient-soft px-4 py-3">
              <span className="text-sm font-semibold text-brand-900">
                Amount due
              </span>
              <span className="font-display text-xl font-extrabold text-brand-900">
                {formatCurrency(payFor.fee, "USD")}
              </span>
            </div>
          )}
          {paySettings && <PaymentInfo settings={paySettings} />}
          <ImageUploader
            value={proofUrl}
            onUploaded={setProofUrl}
            folder="payment-proofs"
            hint="Screenshot of your bank transfer / payment receipt"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        onConfirm={doCancel}
        loading={busy}
        title="Cancel appointment?"
        message="This will release your slot so others can book it. This can't be undone."
        confirmLabel="Yes, cancel"
      />
    </div>
  );
}
