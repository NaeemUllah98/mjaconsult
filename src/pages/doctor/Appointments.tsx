import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  Video,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { listAppointmentsFor, updateAppointment } from "@/lib/api";
import { ensureThread } from "@/lib/chat";
import { requestMeetLink } from "@/lib/meet";
import { isPaid, canRequestMeet, canMessage } from "@/utils/appointment";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { Button } from "@/components/ui/Button";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import { parseISO, isAfter, startOfToday } from "date-fns";
import type { Appointment } from "@/types";

type Tab = "upcoming" | "past" | "all";

export default function DoctorAppointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(
    () => listAppointmentsFor("doctorId", user!.uid),
    [user?.uid],
  );
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const appts = data ?? [];
    const today = startOfToday();
    switch (tab) {
      case "upcoming":
        return appts.filter(
          (a) => a.status === "confirmed" && isAfter(parseISO(a.date), today),
        );
      case "past":
        return appts.filter(
          (a) => a.status === "completed" || !isAfter(parseISO(a.date), today),
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

  async function askForMeet(a: Appointment) {
    setBusyId(a.id);
    try {
      await requestMeetLink(a, user!.name);
      toast.success("Meet link requested — the admin will create & share it");
      reload();
    } catch {
      toast.error("Could not send request. Please try again.");
    } finally {
      setBusyId(null);
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
                  {canRequestMeet(a) && (
                    <Button
                      size="sm"
                      loading={busyId === a.id}
                      onClick={() => askForMeet(a)}
                    >
                      <Video className="h-4 w-4" /> Request Meet link
                    </Button>
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
                    !isAfter(parseISO(a.date), startOfToday()) && (
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
    </div>
  );
}
