import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { listAppointmentsFor, getDoctor } from "@/lib/api";
import { StatCard, PageLoader, EmptyState } from "@/components/ui/Misc";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { formatCurrency } from "@/utils/format";
import { format, isToday, parseISO, isAfter, startOfToday } from "date-fns";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(async () => {
    const [appts, profile] = await Promise.all([
      listAppointmentsFor("doctorId", user!.uid),
      getDoctor(user!.uid),
    ]);
    return { appts, profile };
  }, [user?.uid]);

  if (loading || !data) return <PageLoader />;

  const today = data.appts.filter(
    (a) => isToday(parseISO(a.date)) && a.status !== "cancelled",
  );
  const upcoming = data.appts.filter(
    (a) => a.status === "confirmed" && isAfter(parseISO(a.date), startOfToday()),
  );
  const uniquePatients = new Set(data.appts.map((a) => a.patientId)).size;
  const earned = data.appts
    .filter((a) => a.paymentStatus === "verified")
    .reduce((sum, a) => sum + a.fee, 0);

  const profileIncomplete =
    !data.profile?.availability ||
    Object.keys(data.profile.availability).length === 0;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-hero-glow opacity-60" />
        <div className="relative">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Good day, Dr. {user?.name?.split(" ").slice(-1)}
          </h2>
          <p className="mt-1 text-brand-50">
            You have{" "}
            <strong>
              {today.length} appointment{today.length !== 1 && "s"}
            </strong>{" "}
            scheduled today.
          </p>
        </div>
      </div>

      {profileIncomplete && (
        <Card className="flex items-center gap-4 border-amber-200 bg-amber-50">
          <AlertCircle className="h-6 w-6 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              Set your availability to start receiving bookings
            </p>
            <p className="text-sm text-amber-700">
              Patients can only book once you've added your weekly schedule.
            </p>
          </div>
          <Link to="/doctor/availability">
            <Button size="sm">Set availability</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={today.length}
          icon={<Clock className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Patients"
          value={uniquePatients}
          icon={<Users className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Earned"
          value={formatCurrency(earned, data.profile?.currency ?? "USD")}
          icon={<DollarSign className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            Today's schedule — {format(new Date(), "EEEE, MMM d")}
          </h3>
          <Link
            to="/doctor/appointments"
            className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            All appointments <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {today.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="h-6 w-6" />}
            title="No appointments today"
            description="Enjoy your day — new bookings will appear here."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {today.map((a) => (
              <AppointmentCard key={a.id} appt={a} perspective="doctor" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
