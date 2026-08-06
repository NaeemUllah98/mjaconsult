import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Star,
  Briefcase,
  Languages,
  GraduationCap,
  CalendarClock,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  ShieldQuestion,
  MapPin,
} from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { getDoctor } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import { BookingModal } from "@/components/shared/BookingModal";
import { isDoctorVerified } from "@/utils/license";
import {
  formatCurrency,
  formatTime,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from "@/utils/format";

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: doctor, loading } = useAsync(() => getDoctor(id!), [id]);
  const [booking, setBooking] = useState(false);

  if (loading) return <PageLoader />;
  if (!doctor)
    return (
      <EmptyState
        title="Doctor not found"
        description="This profile may have been removed."
        action={
          <Link to="/patient/doctors">
            <Button>Back to doctors</Button>
          </Link>
        }
      />
    );

  const workingDays = WEEKDAYS.filter(
    (d) => (doctor.availability?.[d] ?? []).length > 0,
  );
  const verified = isDoctorVerified(doctor);

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: identity + booking */}
        <div className="space-y-6">
          <Card className="text-center">
            <Avatar
              name={doctor.name}
              src={doctor.photoURL}
              size="xl"
              className="mx-auto"
              ring
            />
            <h1 className="mt-4 font-display text-xl font-extrabold text-ink">
              {doctor.name}
            </h1>
            <p className="font-medium text-brand-600">{doctor.specialization}</p>
            <p
              className={`mt-2 flex items-center justify-center gap-1.5 text-sm font-bold ${verified ? "text-emerald-600" : "text-ink-muted"}`}
            >
              {verified ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldQuestion className="h-4 w-4" />
              )}
              {verified ? "Verified — license on file" : "Not verified"}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 text-sm text-ink-muted">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {doctor.rating?.toFixed(1) ?? "New"}
              </span>
              {doctor.experienceYears ? (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" /> {doctor.experienceYears} yrs
                </span>
              ) : null}
              {doctor.country ? (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {doctor.country}
                </span>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl bg-brand-gradient-soft p-4">
              <p className="text-xs text-ink-muted">Consultation fee</p>
              <p className="font-display text-2xl font-extrabold text-brand-900">
                {formatCurrency(doctor.fees, doctor.currency ?? "USD")}
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <Button
                fullWidth
                size="lg"
                disabled={!doctor.active}
                onClick={() => setBooking(true)}
              >
                <CalendarClock className="h-5 w-5" />
                {doctor.active ? "Book appointment" : "Currently unavailable"}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
                <MessageSquare className="h-3.5 w-3.5" /> Messaging unlocks after
                booking &amp; payment
              </p>
            </div>
          </Card>
        </div>

        {/* Right: details */}
        <div className="space-y-6 lg:col-span-2">
          {doctor.bio && (
            <Card>
              <h3 className="font-display text-lg font-bold text-ink">About</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{doctor.bio}</p>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {doctor.qualifications && (
              <Card>
                <div className="flex items-center gap-2 text-brand-600">
                  <GraduationCap className="h-5 w-5" />
                  <h3 className="font-display font-bold text-ink">Qualifications</h3>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  {doctor.qualifications}
                </p>
              </Card>
            )}
            {doctor.languages?.length ? (
              <Card>
                <div className="flex items-center gap-2 text-brand-600">
                  <Languages className="h-5 w-5" />
                  <h3 className="font-display font-bold text-ink">Languages</h3>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {doctor.languages.map((l) => (
                    <Badge key={l} tone="brand">
                      {l}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          {verified && (
            <Card>
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="font-display font-bold text-ink">
                  Verified credentials
                </h3>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                License(s) reviewed and kept current by the MJACONSULT admin.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {(doctor.licenses ?? []).map((l) => (
                  <span
                    key={l.id}
                    className="flex items-center gap-1 text-sm font-medium text-emerald-600"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> {l.title}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Availability */}
          <Card>
            <div className="flex items-center gap-2 text-brand-600">
              <CalendarClock className="h-5 w-5" />
              <h3 className="font-display font-bold text-ink">Weekly availability</h3>
            </div>
            {workingDays.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No availability set yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {workingDays.map((day) => (
                  <div
                    key={day}
                    className="flex flex-col gap-2 border-b border-surface-muted pb-3 last:border-0 sm:flex-row sm:items-center"
                  >
                    <span className="flex w-28 items-center gap-1.5 text-sm font-semibold text-ink">
                      <CheckCircle2 className="h-4 w-4 text-teal-500" />
                      {WEEKDAY_LABELS[day]}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(doctor.availability?.[day] ?? []).map((s) => (
                        <span
                          key={s.start}
                          className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                        >
                          {formatTime(s.start)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <BookingModal
        doctor={doctor}
        open={booking}
        onClose={() => setBooking(false)}
      />
    </div>
  );
}
