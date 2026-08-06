import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Video,
  CheckCircle2,
  MessageSquare,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import {
  listAppointmentsFor,
  updateAppointment,
  getDoctor,
  getSiteSettings,
  listPrescriptionsFor,
} from "@/lib/api";
import { ensureThread } from "@/lib/chat";
import { shareMeetLink, normalizeMeetUrl } from "@/lib/meet";
import {
  isPaid,
  canShareMeet,
  canMessage,
  isUpcomingDate,
  isPastDate,
  isFutureDate,
} from "@/utils/appointment";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { PrescriptionEditor } from "@/components/shared/PrescriptionEditor";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import type { Appointment, Prescription } from "@/types";

type Tab = "upcoming" | "past" | "all";

export default function DoctorAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(
    () => listAppointmentsFor("doctorId", user!.uid),
    [user?.uid],
  );
  const { data: doctorRec } = useAsync(() => getDoctor(user!.uid), [user?.uid]);
  const { data: site } = useAsync(() => getSiteSettings(), []);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Prescriptions this doctor has issued, keyed by appointment id.
  const [rxMap, setRxMap] = useState<Record<string, Prescription>>({});
  useEffect(() => {
    if (!user?.uid) return;
    listPrescriptionsFor("doctorId", user.uid).then((list) => {
      const m: Record<string, Prescription> = {};
      list.forEach((p) => (m[p.appointmentId] = p));
      setRxMap(m);
    });
  }, [user?.uid]);
  const [editorFor, setEditorFor] = useState<Appointment | null>(null);
  const [meetFor, setMeetFor] = useState<Appointment | null>(null);
  const [meetUrl, setMeetUrl] = useState("");
  const [sharingMeet, setSharingMeet] = useState(false);

  const filtered = useMemo(() => {
    const appts = data ?? [];
    switch (tab) {
      case "upcoming":
        return appts.filter(
          (a) => a.status === "confirmed" && isUpcomingDate(a.date),
        );
      case "past":
        return appts.filter(
          (a) => a.status === "completed" || isPastDate(a.date),
        );
      default:
        return appts;
    }
  }, [data, tab]);

  async function complete(a: Appointment) {
    setBusyId(a.id);
    try {
      await updateAppointment(a.id, { status: "completed" });
      toast.success("Marked as completed");
      reload();
    } finally {
      setBusyId(null);
    }
  }

  async function sendMeetLink() {
    const normalized = normalizeMeetUrl(meetUrl);
    if (!meetFor || !normalized) return;
    setSharingMeet(true);
    try {
      await shareMeetLink(meetFor, normalized, true);
      toast.success("Meet link sent to your patient");
      setMeetFor(null);
      setMeetUrl("");
      reload();
    } catch {
      toast.error("Could not share the link. Try again.");
    } finally {
      setSharingMeet(false);
    }
  }

  async function messagePatient(a: Appointment) {
    await ensureThread({
      patientId: a.patientId,
      doctorId: user!.uid,
      patientName: a.patientName,
      doctorName: user!.name,
      doctorPhotoURL: user!.photoURL,
    });
    navigate("/doctor/chat");
  }

  if (loading) return <PageLoader />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <PageHeader
        title="Appointments"
        subtitle="Manage your consultations, message patients and join Meet sessions."
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-surface text-brand-700 shadow-soft"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" />}
          title="No appointments here"
          description="Bookings matching this filter will appear here."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              perspective="doctor"
              actions={
                <>
                  {canMessage(a) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => messagePatient(a)}
                    >
                      <MessageSquare className="h-4 w-4" /> Message patient
                    </Button>
                  )}
                  {(a.status === "confirmed" || a.status === "completed") && (
                    <Button
                      size="sm"
                      variant={rxMap[a.id] ? "outline" : "secondary"}
                      onClick={() => setEditorFor(a)}
                    >
                      <FileText className="h-4 w-4" />
                      {rxMap[a.id] ? "Edit prescription" : "Write prescription"}
                    </Button>
                  )}
                  {canShareMeet(a) && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setMeetFor(a);
                        setMeetUrl("");
                      }}
                    >
                      <Video className="h-4 w-4" /> Send Meet link
                    </Button>
                  )}
                  {a.meetRequested && !a.meetLink && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                      <Video className="h-3.5 w-3.5" /> Patient is waiting for
                      the link
                    </span>
                  )}
                  {a.paymentStatus === "proof_submitted" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <MessageSquare className="h-3.5 w-3.5" /> Awaiting payment
                      verification by admin
                    </span>
                  )}
                  {isPaid(a) && a.status !== "cancelled" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                      <MessageSquare className="h-3.5 w-3.5" /> Messaging &amp;
                      Meet open during the appointment slot
                    </span>
                  )}
                  {a.status === "confirmed" &&
                    !isFutureDate(a.date) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busyId === a.id}
                        onClick={() => complete(a)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Complete
                      </Button>
                    )}
                </>
              }
            />
          ))}
        </div>
      )}

      {editorFor && (
        <PrescriptionEditor
          open={!!editorFor}
          onClose={() => setEditorFor(null)}
          appointment={editorFor}
          doctorStampUrl={doctorRec?.stampUrl}
          companyStampUrl={site?.companyStampUrl}
          existing={rxMap[editorFor.id] ?? null}
          onSaved={(rx) =>
            setRxMap((m) => ({ ...m, [rx.appointmentId]: rx }))
          }
        />
      )}

      {/* Send Google Meet link */}
      <Modal
        open={!!meetFor}
        onClose={() => setMeetFor(null)}
        title="Send Google Meet link"
        description={
          meetFor
            ? `Create a meeting for your consultation with ${meetFor.patientName} and share the link.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setMeetFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={sendMeetLink}
              disabled={!normalizeMeetUrl(meetUrl)}
              loading={sharingMeet}
            >
              Send to patient
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
            error={
              meetUrl.trim() && !normalizeMeetUrl(meetUrl)
                ? "That doesn't look like a valid link — check for typos."
                : undefined
            }
          />
          <p className="text-xs text-ink-muted">
            Create the meeting in your Google account, then paste the link
            here. Your patient will be notified immediately.
          </p>
        </div>
      </Modal>
    </div>
  );
}
