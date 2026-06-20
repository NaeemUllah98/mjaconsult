import { Link } from "react-router-dom";
import {
  Stethoscope,
  Users,
  CalendarCheck,
  DollarSign,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAsync } from "@/hooks/useAsync";
import {
  listDoctors,
  listPatients,
  listAllAppointments,
} from "@/lib/api";
import { StatCard, PageLoader, EmptyState } from "@/components/ui/Misc";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AppointmentCard } from "@/components/shared/AppointmentCard";
import { formatCurrency } from "@/utils/format";
import { format, parseISO, subDays, isAfter } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#2c7da0",
  completed: "#34a0a4",
  pending: "#f59e0b",
  cancelled: "#f43f5e",
};

export default function AdminDashboard() {
  const { data, loading } = useAsync(async () => {
    const [doctors, patients, appts] = await Promise.all([
      listDoctors(),
      listPatients(),
      listAllAppointments(),
    ]);
    return { doctors, patients, appts };
  }, []);

  if (loading || !data) return <PageLoader />;

  const revenue = data.appts
    .filter((a) => a.paymentStatus === "verified")
    .reduce((s, a) => s + a.fee, 0);

  // Bookings over the last 7 days
  const trend = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const key = format(day, "yyyy-MM-dd");
    return {
      day: format(day, "EEE"),
      bookings: data.appts.filter((a) => a.date === key).length,
    };
  });

  const statusData = ["confirmed", "completed", "pending", "cancelled"]
    .map((status) => ({
      name: status,
      value: data.appts.filter((a) => a.status === status).length,
    }))
    .filter((d) => d.value > 0);

  const recent = [...data.appts]
    .filter((a) => isAfter(parseISO(a.date), subDays(new Date(), 30)))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">
            Admin overview
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Monitor platform activity at a glance.
          </p>
        </div>
        <Link to="/admin/doctors">
          <Button>
            <Stethoscope className="h-4 w-4" /> Add doctor
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Doctors"
          value={data.doctors.length}
          icon={<Stethoscope className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Patients"
          value={data.patients.length}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Appointments"
          value={data.appts.length}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Revenue (verified)"
          value={formatCurrency(revenue)}
          icon={<DollarSign className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-brand-600">
            <Activity className="h-5 w-5" />
            <h3 className="font-display font-bold text-ink">
              Bookings — last 7 days
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2c7da0" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2c7da0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef3f5" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7c89", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #eef3f5",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="bookings"
                stroke="#2c7da0"
                strokeWidth={2.5}
                fill="url(#g)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="mb-4 font-display font-bold text-ink">
            Appointments by status
          </h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-ink-muted">No data yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {statusData.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 capitalize text-ink-soft">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: STATUS_COLORS[s.name] }}
                      />
                      {s.name}
                    </span>
                    <span className="font-semibold text-ink">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            Recent appointments
          </h3>
          <Link
            to="/admin/appointments"
            className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="h-6 w-6" />}
            title="No recent appointments"
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {recent.map((a) => (
              <AppointmentCard key={a.id} appt={a} perspective="admin" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
