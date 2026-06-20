import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { bookAppointment, getTakenSlots } from "@/lib/api";
import { notify } from "@/lib/notifications";
import {
  formatCurrency,
  formatTime,
  weekdayFromISO,
  WEEKDAY_LABELS,
} from "@/utils/format";
import type { Doctor, TimeSlot } from "@/types";

export function BookingModal({
  doctor,
  open,
  onClose,
  freeCampaign,
  onBooked,
}: {
  doctor: Doctor;
  open: boolean;
  onClose: () => void;
  freeCampaign?: boolean;
  onBooked?: () => void;
}) {
  const { user } = useAuth();
  const [dateISO, setDateISO] = useState("");
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);

  // Next 14 days as quick-pick chips.
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = addDays(new Date(), i);
        return {
          iso: format(d, "yyyy-MM-dd"),
          label: format(d, "EEE"),
          day: format(d, "d"),
          weekday: weekdayFromISO(format(d, "yyyy-MM-dd")),
        };
      }),
    [],
  );

  const slotsForDay: TimeSlot[] = dateISO
    ? (doctor.availability?.[weekdayFromISO(dateISO)] ?? [])
    : [];

  useEffect(() => {
    if (!dateISO) return;
    setSlot(null);
    setLoadingSlots(true);
    getTakenSlots(doctor.uid, dateISO)
      .then(setTaken)
      .finally(() => setLoadingSlots(false));
  }, [dateISO, doctor.uid]);

  function reset() {
    setDateISO("");
    setSlot(null);
    setReason("");
    setDone(false);
  }

  async function confirm() {
    if (!user || !slot || !dateISO) return;
    setBooking(true);
    try {
      // Atomic booking (locks the slot). The Google Meet link is created later
      // by the admin on request — see lib/meet.ts.
      await bookAppointment({
        patientId: user.uid,
        patientName: user.name,
        patientPhone: user.phone,
        patientEmail: user.email,
        doctorId: doctor.uid,
        doctorName: doctor.name,
        doctorSpecialization: doctor.specialization,
        doctorPhotoURL: doctor.photoURL,
        date: dateISO,
        slot,
        reason,
        fee: freeCampaign ? 0 : doctor.fees,
        isFree: !!freeCampaign,
        paymentStatus: freeCampaign ? "free" : "unpaid",
      });

      // Notify the doctor.
      await notify({
        userId: doctor.uid,
        email: doctor.email,
        name: doctor.name,
        title: "New appointment booked",
        body: `${user.name} booked ${format(new Date(dateISO), "MMM d")} at ${formatTime(slot.start)}.`,
        type: "appointment",
        sendEmailToo: true,
      });

      setDone(true);
      onBooked?.();
    } catch (err: any) {
      if (err?.message === "SLOT_TAKEN") {
        toast.error("Sorry, that slot was just taken. Please pick another.");
        // refresh taken slots
        getTakenSlots(doctor.uid, dateISO).then(setTaken);
        setSlot(null);
      } else {
        toast.error("Booking failed. Please try again.");
      }
    } finally {
      setBooking(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setTimeout(reset, 200);
      }}
      title={done ? "Appointment confirmed 🎉" : `Book with ${doctor.name}`}
      description={
        done
          ? undefined
          : `${doctor.specialization} • ${freeCampaign ? "Free campaign" : formatCurrency(doctor.fees, doctor.currency ?? "USD")}`
      }
      size="lg"
    >
      {done ? (
        <ConfirmedView
          doctorName={doctor.name}
          dateISO={dateISO}
          slot={slot!}
          onClose={() => {
            onClose();
            setTimeout(reset, 200);
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Step 1: date */}
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft">
              <Calendar className="h-4 w-4 text-brand-500" /> Choose a date
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {days.map((d) => {
                const hasSlots = (doctor.availability?.[d.weekday] ?? []).length > 0;
                const selected = dateISO === d.iso;
                return (
                  <button
                    key={d.iso}
                    disabled={!hasSlots}
                    onClick={() => setDateISO(d.iso)}
                    className={`flex min-w-[58px] flex-col items-center rounded-xl border px-3 py-2 text-sm transition ${
                      selected
                        ? "border-brand-400 bg-brand-gradient text-white shadow-glow"
                        : hasSlots
                          ? "border-surface-muted text-ink-soft hover:border-brand-300"
                          : "cursor-not-allowed border-surface-muted/60 text-ink-muted/40"
                    }`}
                  >
                    <span className="text-xs font-medium">{d.label}</span>
                    <span className="font-display text-lg font-bold">{d.day}</span>
                  </button>
                );
              })}
            </div>
            {dateISO && slotsForDay.length === 0 && (
              <p className="mt-2 text-sm text-ink-muted">
                {doctor.name} isn't available on{" "}
                {WEEKDAY_LABELS[weekdayFromISO(dateISO)]}.
              </p>
            )}
          </div>

          {/* Step 2: slot */}
          {dateISO && slotsForDay.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <Clock className="h-4 w-4 text-brand-500" /> Pick a time
              </p>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking
                  availability…
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slotsForDay.map((s) => {
                    const isTaken = taken.includes(s.start);
                    const selected = slot?.start === s.start;
                    return (
                      <button
                        key={s.start}
                        disabled={isTaken}
                        onClick={() => setSlot(s)}
                        className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                          selected
                            ? "border-brand-400 bg-brand-gradient text-white shadow-glow"
                            : isTaken
                              ? "cursor-not-allowed border-surface-muted bg-surface-muted text-ink-muted/50 line-through"
                              : "border-surface-muted text-ink-soft hover:border-brand-300"
                        }`}
                      >
                        {formatTime(s.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: reason */}
          {slot && (
            <Textarea
              label="Reason for visit (optional)"
              placeholder="Briefly describe your symptoms or reason…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}

          {/* Payment + Meet note */}
          {slot && (
            <div className="space-y-3 rounded-xl bg-surface-subtle p-4 text-sm">
              <div className="flex items-center gap-2 text-ink-soft">
                <Video className="h-4 w-4 text-brand-500" />
                Once your payment is verified, request a Google Meet link from{" "}
                <strong>My Appointments</strong> — the admin shares it with you
                and the doctor.
              </div>
              {!freeCampaign && (
                <div className="flex items-start gap-2 text-ink-muted">
                  <Info className="mt-0.5 h-4 w-4 text-amber-500" />
                  After booking, upload your payment proof from{" "}
                  <strong>My Appointments</strong> for verification.
                </div>
              )}
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            disabled={!slot}
            loading={booking}
            onClick={confirm}
          >
            {freeCampaign
              ? "Book free consultation"
              : `Confirm booking • ${formatCurrency(doctor.fees, doctor.currency ?? "USD")}`}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function ConfirmedView({
  doctorName,
  dateISO,
  slot,
  onClose,
}: {
  doctorName: string;
  dateISO: string;
  slot: TimeSlot;
  onClose: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-500">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-ink">
        You're all set!
      </h3>
      <p className="mt-2 text-ink-muted">
        Your appointment with <strong>{doctorName}</strong> on{" "}
        {format(new Date(dateISO), "EEEE, MMM d")} at {formatTime(slot.start)} is
        confirmed.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Close
        </Button>
        <a href="/patient/appointments" className="w-full">
          <Button fullWidth>View appointments</Button>
        </a>
      </div>
    </div>
  );
}
