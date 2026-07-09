import { useState } from "react";
import { CalendarClock, Save, Plus, Trash2, Wand2, Globe2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getDoctor, upsertDoctor } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Misc";
import { WEEKDAYS, WEEKDAY_LABELS, formatTime } from "@/utils/format";
import { generateSlots } from "@/utils/slots";
import { browserTimeZone, listTimeZones } from "@/utils/timezone";
import type { Doctor, TimeSlot, Weekday } from "@/types";

export default function DoctorAvailability() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => getDoctor(user!.uid), [user?.uid]);

  if (loading) return <PageLoader />;
  return <Editor doctor={data} uid={user!.uid} email={user!.email} name={user!.name} />;
}

function Editor({
  doctor,
  uid,
  email,
  name,
}: {
  doctor: Doctor | null;
  uid: string;
  email: string;
  name: string;
}) {
  const [availability, setAvailability] = useState<
    Partial<Record<Weekday, TimeSlot[]>>
  >(doctor?.availability ?? {});
  const [duration, setDuration] = useState(doctor?.slotDurationMins ?? 30);
  const [range, setRange] = useState({ start: "09:00", end: "17:00" });
  const [timezone, setTimezone] = useState(doctor?.timezone || browserTimeZone());
  const [saving, setSaving] = useState(false);
  const zones = listTimeZones();

  const toggleDay = (day: Weekday) =>
    setAvailability((a) => {
      const next = { ...a };
      if (next[day]) delete next[day];
      else next[day] = generateSlots(range.start, range.end, duration);
      return next;
    });

  const autofillDay = (day: Weekday) =>
    setAvailability((a) => ({
      ...a,
      [day]: generateSlots(range.start, range.end, duration),
    }));

  const removeSlot = (day: Weekday, start: string) =>
    setAvailability((a) => ({
      ...a,
      [day]: (a[day] ?? []).filter((s) => s.start !== start),
    }));

  const applyToAll = () => {
    const slots = generateSlots(range.start, range.end, duration);
    const next: Partial<Record<Weekday, TimeSlot[]>> = {};
    WEEKDAYS.forEach((d) => {
      if (d !== "sunday" && d !== "saturday") next[d] = slots;
    });
    setAvailability(next);
    toast.success("Applied Mon–Fri schedule");
  };

  async function save() {
    setSaving(true);
    try {
      await upsertDoctor({
        ...(doctor ?? ({ uid, email, name, role: "doctor", active: true } as Doctor)),
        uid,
        email,
        name,
        role: "doctor",
        specialization: doctor?.specialization ?? "",
        fees: doctor?.fees ?? 0,
        active: doctor?.active ?? true,
        availability,
        slotDurationMins: duration,
        timezone,
      });
      toast.success("Availability saved");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Manage availability"
        subtitle="Define the days and times patients can book consultations with you."
        action={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save schedule
          </Button>
        }
      />

      {/* Timezone */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 text-brand-600">
          <Globe2 className="h-5 w-5" />
          <h3 className="font-display font-bold text-ink">Your timezone</h3>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          All the times below are in this timezone. Patients anywhere in the
          world will automatically see them converted to their own local time
          when booking.
        </p>
        <div className="mt-4 max-w-sm">
          <Select
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Slot generator */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 text-brand-600">
          <Wand2 className="h-5 w-5" />
          <h3 className="font-display font-bold text-ink">Quick slot generator</h3>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Set your working hours and slot length, then enable days below.
        </p>
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-4">
          <Input
            label="Start time"
            type="time"
            value={range.start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
          />
          <Input
            label="End time"
            type="time"
            value={range.end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
          />
          <Select
            label="Slot length"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </Select>
          <Button variant="outline" onClick={applyToAll}>
            Apply Mon–Fri
          </Button>
        </div>
      </Card>

      {/* Day editors */}
      <div className="grid gap-4 lg:grid-cols-2">
        {WEEKDAYS.map((day) => {
          const enabled = !!availability[day];
          const slots = availability[day] ?? [];
          return (
            <Card key={day} className={enabled ? "" : "opacity-80"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDay(day)}
                    className={`relative h-6 w-11 rounded-full transition ${
                      enabled ? "bg-brand-gradient" : "bg-surface-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        enabled ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <h3 className="font-display font-bold text-ink">
                    {WEEKDAY_LABELS[day]}
                  </h3>
                </div>
                {enabled ? (
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{slots.length} slots</Badge>
                    <button
                      onClick={() => autofillDay(day)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-brand-500 hover:bg-brand-50"
                      title="Regenerate from hours above"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-ink-muted">Off</span>
                )}
              </div>

              {enabled && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {slots.length === 0 ? (
                    <p className="text-sm text-ink-muted">
                      No slots — click + to generate.
                    </p>
                  ) : (
                    slots.map((s) => (
                      <button
                        key={s.start}
                        onClick={() => removeSlot(day, s.start)}
                        className="group flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        {formatTime(s.start)}
                        <Trash2 className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} loading={saving} size="lg">
          <Save className="h-4 w-4" /> Save schedule
        </Button>
      </div>
    </div>
  );
}
