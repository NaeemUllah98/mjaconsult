import { useState } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { updateUser } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/ui/ImageUploader";

export default function PatientProfile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    photoURL: user?.photoURL ?? "",
    gender: (user as any)?.gender ?? "",
    dateOfBirth: (user as any)?.dateOfBirth ?? "",
    bloodGroup: (user as any)?.bloodGroup ?? "",
    address: (user as any)?.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(user!.uid, form as any);
      await refreshUser();
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="My profile"
        subtitle="Keep your personal and contact details up to date."
      />
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center">
          <ImageUploader
            value={form.photoURL}
            onUploaded={(url) => setForm((f) => ({ ...f, photoURL: url }))}
            folder="profiles"
            variant="avatar"
          />
          <p className="mt-4 font-display font-bold text-ink">{form.name}</p>
          <p className="text-sm text-ink-muted">{user?.email}</p>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={set("name")} />
            <Input label="Phone" value={form.phone} onChange={set("phone")} />
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={set("dateOfBirth")}
            />
            <Select label="Gender" value={form.gender} onChange={set("gender")}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Input
              label="Blood group"
              placeholder="e.g. O+"
              value={form.bloodGroup}
              onChange={set("bloodGroup")}
            />
            <Input
              label="Address"
              value={form.address}
              onChange={set("address")}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Save className="h-4 w-4" /> Save changes
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
