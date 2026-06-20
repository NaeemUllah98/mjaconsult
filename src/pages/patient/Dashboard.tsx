import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Stethoscope,
  Clock,
  Video,
  ArrowRight,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { listAppointmentsFor, listDoctors, listPromotions } from "@/lib/api";
import { StatCard, PageLoader, EmptyState } from "@/components/ui/Misc";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { DoctorCard } from "@/components/shared/DoctorCard";
import { isAfter, parseISO, startOfToday } from "date-fns";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const [appts, doctors, promos] = await Promise.all([
      listAppointmentsFor("patientId", user!.uid),
      listDoctors(true),
      listPromotions(true),
    ]);
    return { appts, doctors, promos };
  }, [user?.uid]);

  if (loading || !data) return <PageLoader />;

  const upcoming = data.appts.filter(
    (a) =>
      a.status === "confirmed" &&
      isAfter(parseISO(a.date), startOfToday()),
  );
  const next = upcoming[upcoming.length - 1];

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-hero-glow opacity-60" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Welcome back, {user?.name?.split(" ")[0]}!
            </h2>
            <p className="mt-1 max-w-md text-brand-50">
              Manage your consultations, chat with doctors and stay on top of
              your health.
            </p>
          </div>
          <Link to="/patient/doctors">
            <Button className="bg-white text-brand-700 hover:bg-brand-50">
              Book a consultation <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Total visits"
          value={data.appts.length}
          icon={<Clock className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Doctors"
          value={data.doctors.length}
          icon={<Stethoscope className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Active offers"
          value={data.promos.length}
          icon={<Megaphone className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      {/* Next appointment */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">
            Your next appointment
          </h3>
          {next ? (
            <AppointmentCard appt={next} perspective="patient" />
          ) : (
            <EmptyState
              icon={<CalendarCheck className="h-6 w-6" />}
              title="No upcoming appointments"
              description="Find a doctor and book your next consultation."
              action={
                <Link to="/patient/doctors">
                  <Button>Find a doctor</Button>
                </Link>
              }
            />
          )}
        </div>

        <Card className="bg-brand-gradient-soft">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white">
              <Video className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-ink">Quick actions</h3>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { to: "/patient/doctors", label: "Browse doctors" },
              { to: "/patient/appointments", label: "My appointments" },
              { to: "/patient/chat", label: "Message a doctor" },
              { to: "/patient/promotions", label: "View offers" },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-white hover:text-brand-700"
              >
                {a.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Featured doctors */}
      {data.doctors.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">
              Top doctors for you
            </h3>
            <Link
              to="/patient/doctors"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.doctors.slice(0, 3).map((d) => (
              <DoctorCard key={d.uid} doctor={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
