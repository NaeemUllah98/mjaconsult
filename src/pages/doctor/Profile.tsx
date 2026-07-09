import { useState } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "@/hooks/useAsync";
import { getDoctor, upsertDoctor } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { PageLoader } from "@/components/ui/Misc";
import type { Doctor } from "@/types";

export default function DoctorProfileEdit() {
  const { user, refreshUser } = useAuth();
  const { data, loading } = useAsync(() => getDoctor(user!.uid), [user?.uid]);
  if (loading) return <PageLoader />;
  return <Form doctor={data} uid={user!.uid} email={user!.email} refresh={refreshUser} />;
}

function Form({
  doctor,
  uid,
  email,
  refresh,
}: {
  doctor: Doctor | null;
  uid: string;
  email: string;
  refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: doctor?.name ?? "",
    phone: doctor?.phone ?? "",
    photoURL: doctor?.photoURL ?? "",
    specialization: doctor?.specialization ?? "",
    qualifications: doctor?.qualifications ?? "",
    experienceYears: doctor?.experienceYears ?? 0,
    languages: (doctor?.languages ?? []).join(", "),
    bio: doctor?.bio ?? "",
    fees: doctor?.fees ?? 0,
    currency: doctor?.currency ?? "USD",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertDoctor({
        ...(doctor ?? ({} as Doctor)),
        uid,
        email,
        role: "doctor",
        active: doctor?.active ?? true,
        availability: doctor?.availability ?? {},
        slotDurationMins: doctor?.slotDurationMins ?? 30,
        name: form.name,
        phone: form.phone,
        photoURL: form.photoURL,
        specialization: form.specialization,
        qualifications: form.qualifications,
        experienceYears: Number(form.experienceYears),
        languages: form.languages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        bio: form.bio,
        fees: Number(form.fees),
        currency: form.currency,
      });
      await refresh();
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="My professional profile"
        subtitle="This is what patients see. Keep it polished and up to date."
        action={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save
          </Button>
        }
      />
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center">
          <ImageUploader
            value={form.photoURL}
            onUploaded={(url) => setForm((f) => ({ ...f, photoURL: url }))}
            folder="profiles"
            variant="avatar"
          />
          <p className="mt-4 font-display font-bold text-ink">
            {form.name || "Your name"}
          </p>
          <p className="text-sm text-brand-600">
            {form.specialization || "Specialization"}
          </p>
          <div className="mt-4 w-full rounded-xl bg-brand-gradient-soft p-3">
            <p className="text-xs text-ink-muted">Consultation fee</p>
            <p className="font-display text-xl font-extrabold text-brand-900">
              {form.currency} {form.fees}
            </p>
          </div>

          <div className="mt-4 w-full rounded-xl border border-surface-muted p-3">
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Signature stamp (on your prescriptions)
            </p>
            {doctor?.stampUrl ? (
              <>
                <img
                  src={doctor.stampUrl}
                  alt="Your signature stamp"
                  className="mx-auto max-h-16 object-contain"
                />
                <p className="mt-2 text-[11px] text-ink-muted">
                  Managed by the admin
                </p>
              </>
            ) : (
              <p className="text-[11px] text-ink-muted">
                Not assigned yet — ask the admin to upload your stamp so it
                appears on prescriptions you issue.
              </p>
            )}
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={set("name")} required />
            <Input label="Phone" value={form.phone} onChange={set("phone")} />
            <Input
              label="Specialization"
              placeholder="e.g. Cardiologist"
              value={form.specialization}
              onChange={set("specialization")}
              required
            />
            <Input
              label="Experience (years)"
              type="number"
              value={form.experienceYears}
              onChange={set("experienceYears")}
            />
            <Input
              label="Qualifications"
              placeholder="e.g. MBBS, MD"
              value={form.qualifications}
              onChange={set("qualifications")}
            />
            <Input
              label="Languages (comma separated)"
              placeholder="English, Urdu"
              value={form.languages}
              onChange={set("languages")}
            />
            <Input
              label="Consultation fee"
              type="number"
              value={form.fees}
              onChange={set("fees")}
            />
            <Select label="Currency" value={form.currency} onChange={set("currency")}>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="PKR">PKR (₨)</option>
              <option value="INR">INR (₹)</option>
              <option value="AED">AED (د.إ)</option>
            </Select>
          </div>
          <Textarea
            label="About you"
            placeholder="Tell patients about your background and approach to care…"
            value={form.bio}
            onChange={set("bio")}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" /> Save profile
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
