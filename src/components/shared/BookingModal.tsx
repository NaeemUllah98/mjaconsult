import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Loader2,
  Info,
  Wallet,
  Upload,
  Ticket,
} from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { PaymentInfo } from "@/components/shared/PaymentInfo";
import { useAuth } from "@/context/AuthContext";
import {
  bookAppointment,
  getTakenSlots,
  updateAppointment,
  listAdmins,
  getPaymentSettings,
} from "@/lib/api";
import { DEFAULT_PAYMENT_SETTINGS } from "@/lib/demo/seed";
import { notify, notifyMany, adminRecipients } from "@/lib/notifications";
import { computePromoFee, discountLabel } from "@/utils/appointment";
import {
  formatCurrency,
  formatTime,
  weekdayFromISO,
  WEEKDAY_LABELS,
} from "@/utils/format";
import {
  browserTimeZone,
  zonedTimeToUtc,
  formatTimeInZone,
  zoneAbbreviation,
} from "@/utils/timezone";
import type { Doctor, Promotion, PaymentSettings, TimeSlot } from "@/types";

type View = "select" | "pay-accounts" | "pay-upload" | "submitted" | "done";

export function BookingModal({
  doctor,
  open,
  onClose,
  promo,
  onBooked,
}: {
  doctor: Doctor;
  open: boolean;
  onClose: () => void;
  promo?: Promotion;
  onBooked?: () => void;
}) {
  const { user } = useAuth();
  const [dateISO, setDateISO] = useState("");
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [taken, setTaken] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [view, setView] = useState<View>("select");
  const [apptId, setApptId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);

  const currency = doctor.currency ?? "USD";
  const fee = useMemo(() => computePromoFee(doctor.fees, promo), [doctor.fees, promo]);
  const isFree = fee === 0;

  const doctorTz = doctor.timezone || "UTC";
  const viewerTz = useMemo(() => browserTimeZone(), []);
  const showLocalTime = doctorTz !== viewerTz;
  const viewerTimeFor = (time: string) =>
    dateISO
      ? formatTimeInZone(zonedTimeToUtc(dateISO, time, doctorTz), viewerTz)
      : formatTime(time);

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
    setView("select");
    setApptId(null);
    setProofUrl("");
  }

  function closeAll() {
    onClose();
    setTimeout(reset, 200);
  }

  async function confirm() {
    if (!user || !slot || !dateISO) return;
    setBooking(true);

    // --- Step 1: create the booking (this is the only step that may fail
    //     in a way that should abort the flow). ---
    let id: string;
    try {
      // Paid bookings start as "pending" and only become "confirmed" once an
      // admin verifies the payment proof. Free offers are confirmed instantly.
      id = await bookAppointment({
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
        doctorTimezone: doctorTz,
        reason,
        fee,
        isFree,
        promoId: promo?.id,
        promoTitle: promo?.title,
        originalFee: doctor.fees,
        status: isFree ? "confirmed" : "pending",
        paymentStatus: isFree ? "free" : "unpaid",
      });
    } catch (err: any) {
      if (err?.message === "SLOT_TAKEN") {
        toast.error("Sorry, that slot was just taken. Please pick another.");
        getTakenSlots(doctor.uid, dateISO).then(setTaken);
        setSlot(null);
      } else {
        console.error("booking failed", err);
        toast.error(err?.message ? `Booking failed: ${err.message}` : "Booking failed. Please try again.");
      }
      setBooking(false);
      return;
    }

    // --- Step 2: post-booking steps are best-effort and must NOT block the
    //     payment popup from opening (notifications/settings reads can fail
    //     e.g. if email or security rules aren't fully configured). ---
    setApptId(id);
    onBooked?.();

    // Fan the new booking out to the doctor, the patient and every admin —
    // each gets an in-app notification and (if EmailJS is configured) an email.
    const apptLabel = `${format(new Date(dateISO), "MMM d")} at ${formatTime(slot.start)}`;
    adminRecipients()
      .then((admins) =>
        notifyMany([
          {
            userId: doctor.uid,
            email: doctor.email,
            name: doctor.name,
            title: "New appointment booked",
            body: `${user.name} booked you for ${apptLabel}.`,
            type: "appointment",
            link: "/doctor/appointments",
            sendEmailToo: true,
          },
          {
            userId: user.uid,
            email: user.email,
            name: user.name,
            title: isFree ? "Appointment confirmed ✅" : "Booking received",
            body: isFree
              ? `Your appointment with ${doctor.name} on ${apptLabel} is confirmed.`
              : `Your booking with ${doctor.name} on ${apptLabel} is received. Please complete payment to confirm your slot.`,
            type: "appointment",
            link: "/patient/appointments",
            sendEmailToo: true,
          },
          ...admins.map((a) => ({
            ...a,
            title: "New booking",
            body: `${user.name} booked ${doctor.name} for ${apptLabel}.`,
            type: "appointment" as const,
            link: "/admin/appointments",
            sendEmailToo: true,
          })),
        ]),
      )
      .catch(() => {});

    if (isFree) {
      setView("done");
    } else {
      const settings = await getPaymentSettings(); // never throws (falls back)
      setPaySettings(settings);
      setView("pay-accounts");
    }
    setBooking(false);
  }

  async function submitProof() {
    if (!apptId || !proofUrl) return;
    setSubmitting(true);
    try {
      await updateAppointment(apptId, {
        paymentProofUrl: proofUrl,
        paymentStatus: "proof_submitted",
      });
      const admins = await listAdmins();
      await Promise.all(
        admins.map((a) =>
          notify({
            userId: a.uid,
            email: a.email,
            name: a.name,
            title: "Payment proof submitted",
            body: `${user?.name} uploaded payment proof for ${dateISO} — review needed.`,
            type: "payment",
            link: "/admin/appointments",
            sendEmailToo: true,
          }),
        ),
      );
      setView("submitted");
    } catch {
      toast.error("Could not submit proof. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const titles: Record<View, string> = {
    select: `Book with ${doctor.name}`,
    "pay-accounts": "Complete your payment",
    "pay-upload": "Upload payment proof",
    submitted: "Booking received 🎉",
    done: "Appointment confirmed 🎉",
  };

  return (
    <Modal
      open={open}
      onClose={closeAll}
      title={titles[view]}
      description={
        view === "select"
          ? `${doctor.specialization} • ${
              isFree ? "Free offer" : formatCurrency(fee, currency)
            }`
          : undefined
      }
      size="lg"
    >
      {view === "select" && (
        <div className="space-y-6">
          {promo && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
              <Ticket className="h-4 w-4" />
              <span>
                <strong>{promo.title}</strong>
                {discountLabel(promo) ? ` — ${discountLabel(promo)}` : ""}
              </span>
            </div>
          )}

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
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <Clock className="h-4 w-4 text-brand-500" /> Pick a time
              </p>
              {showLocalTime && (
                <p className="mb-2 text-xs text-ink-muted">
                  Shown in {doctor.name}'s time (
                  {zoneAbbreviation(zonedTimeToUtc(dateISO, "12:00", doctorTz), doctorTz)}) —
                  your local time is shown underneath each slot.
                </p>
              )}
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
                        className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                          selected
                            ? "border-brand-400 bg-brand-gradient text-white shadow-glow"
                            : isTaken
                              ? "cursor-not-allowed border-surface-muted bg-surface-muted text-ink-muted/50 line-through"
                              : "border-surface-muted text-ink-soft hover:border-brand-300"
                        }`}
                      >
                        {formatTime(s.start)}
                        {showLocalTime && (
                          <span
                            className={`text-[11px] font-normal ${selected ? "text-white/80" : "text-ink-muted"}`}
                          >
                            {viewerTimeFor(s.start)} your time
                          </span>
                        )}
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

          {slot && (
            <div className="space-y-3 rounded-xl bg-surface-subtle p-4 text-sm">
              <div className="flex items-center gap-2 text-ink-soft">
                <Video className="h-4 w-4 text-brand-500" />
                You can message the doctor and request a Google Meet link during
                your booked slot, once payment is verified.
              </div>
              {!isFree && (
                <div className="flex items-start gap-2 text-ink-muted">
                  <Info className="mt-0.5 h-4 w-4 text-amber-500" />
                  Next you'll see our bank accounts and upload your payment
                  proof for verification.
                </div>
              )}
            </div>
          )}

          <Button fullWidth size="lg" disabled={!slot} loading={booking} onClick={confirm}>
            {isFree
              ? "Book free consultation"
              : `Confirm & pay • ${formatCurrency(fee, currency)}`}
          </Button>
        </div>
      )}

      {view === "pay-accounts" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-xl bg-brand-gradient-soft p-4">
            <span className="flex items-center gap-2 font-semibold text-brand-900">
              <Wallet className="h-5 w-5" /> Amount due
            </span>
            <span className="font-display text-2xl font-extrabold text-brand-900">
              {formatCurrency(fee, currency)}
            </span>
          </div>

          <PaymentInfo settings={paySettings ?? DEFAULT_PAYMENT_SETTINGS} />

          <Button fullWidth size="lg" onClick={() => setView("pay-upload")}>
            OK — upload payment proof <Upload className="h-4 w-4" />
          </Button>
          <p className="text-center text-xs text-ink-muted">
            Your slot is held. You can also upload the proof later from{" "}
            <strong>My Appointments</strong>.
          </p>
        </div>
      )}

      {view === "pay-upload" && (
        <div className="space-y-4">
          <ImageUploader
            value={proofUrl}
            onUploaded={setProofUrl}
            folder="payment-proofs"
            hint="Screenshot of your bank transfer / payment receipt"
          />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setView("pay-accounts")}>
              Back
            </Button>
            <Button
              fullWidth
              onClick={submitProof}
              disabled={!proofUrl}
              loading={submitting}
            >
              Submit for verification
            </Button>
          </div>
        </div>
      )}

      {view === "submitted" && (
        <div className="py-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-amber-500">
            <Wallet className="h-9 w-9" />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-ink">
            Payment proof submitted
          </h3>
          <p className="mt-2 text-ink-muted">
            Once our team verifies your payment, your slot with{" "}
            <strong>{doctor.name}</strong> will be confirmed and you'll be
            notified.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" fullWidth onClick={closeAll}>
              Close
            </Button>
            <a href="/patient/appointments" className="w-full">
              <Button fullWidth>View appointments</Button>
            </a>
          </div>
        </div>
      )}

      {view === "done" && (
        <ConfirmedView
          doctorName={doctor.name}
          dateISO={dateISO}
          slot={slot!}
          localTime={showLocalTime ? viewerTimeFor(slot!.start) : undefined}
          onClose={closeAll}
        />
      )}
    </Modal>
  );
}

function ConfirmedView({
  doctorName,
  dateISO,
  slot,
  localTime,
  onClose,
}: {
  doctorName: string;
  dateISO: string;
  slot: TimeSlot;
  localTime?: string;
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
        {format(new Date(dateISO), "EEEE, MMM d")} at {formatTime(slot.start)}
        {localTime ? ` (${localTime} your time)` : ""} is confirmed.
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
