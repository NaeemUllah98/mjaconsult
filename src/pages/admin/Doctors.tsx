import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Stethoscope,
  Pencil,
  Trash2,
  Power,
  Star,
  Mail,
  AlertTriangle,
  Stamp,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  subscribeDoctors,
  setDoctorActive,
  deleteDoctor,
  upsertDoctor,
} from "@/lib/api";
import { isDoctorOnline, isOnDutyNow } from "@/utils/presence";
import { relativeTime } from "@/utils/format";
import { createDoctorAccount } from "@/lib/adminAccounts";
import { authErrorMessage } from "@/utils/authErrors";
import { writeErrorMessage } from "@/utils/firebaseErrors";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import { formatCurrency } from "@/utils/format";
import type { Doctor } from "@/types";

const empty = {
  name: "",
  email: "",
  password: "",
  phone: "",
  specialization: "",
  qualifications: "",
  experienceYears: 0,
  fees: 0,
  currency: "USD",
  bio: "",
  photoURL: "",
  stampUrl: "",
};

export default function AdminDoctors() {
  const [data, setData] = useState<Doctor[] | null>(null);
  const loading = data === null;
  // Live subscription keeps presence (online/offline) fresh automatically.
  useEffect(() => subscribeDoctors(setData), []);
  // Re-render on a timer so the "last seen" freshness guard stays accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const reload = () => {}; // snapshots update the list automatically
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Doctor | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (d) =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.specialization?.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q],
  );

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openAdd() {
    setForm({ ...empty });
    setAdding(true);
  }

  function openEdit(d: Doctor) {
    setForm({
      ...empty,
      name: d.name,
      email: d.email,
      phone: d.phone ?? "",
      specialization: d.specialization,
      qualifications: d.qualifications ?? "",
      experienceYears: d.experienceYears ?? 0,
      fees: d.fees,
      currency: d.currency ?? "USD",
      bio: d.bio ?? "",
      photoURL: d.photoURL ?? "",
      stampUrl: d.stampUrl ?? "",
    });
    setEditing(d);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await upsertDoctor({
          ...editing,
          name: form.name,
          phone: form.phone,
          specialization: form.specialization,
          qualifications: form.qualifications,
          experienceYears: Number(form.experienceYears),
          fees: Number(form.fees),
          currency: form.currency,
          bio: form.bio,
          photoURL: form.photoURL,
          stampUrl: form.stampUrl,
        });
        toast.success("Doctor updated");
        setEditing(null);
      } else {
        if (form.password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          setSaving(false);
          return;
        }
        await createDoctorAccount({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          specialization: form.specialization,
          qualifications: form.qualifications,
          experienceYears: Number(form.experienceYears),
          fees: Number(form.fees),
          currency: form.currency,
          bio: form.bio,
          photoURL: form.photoURL,
          stampUrl: form.stampUrl,
        });
        toast.success("Doctor account created");
        setAdding(false);
      }
      reload();
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: Doctor) {
    try {
      await setDoctorActive(d.uid, !d.active);
      toast.success(d.active ? "Doctor deactivated" : "Doctor activated");
      reload();
    } catch (err) {
      console.error("setDoctorActive failed", err);
      toast.error(writeErrorMessage(err, "update the doctor"));
    }
  }

  async function remove() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await deleteDoctor(removeTarget.uid);
      toast.success("Doctor removed");
      setRemoveTarget(null);
      reload();
    } catch (err) {
      console.error("deleteDoctor failed", err);
      toast.error(writeErrorMessage(err, "remove the doctor"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;

  const modalOpen = adding || !!editing;

  return (
    <div>
      <PageHeader
        title="Doctors"
        subtitle="Add, edit, activate and remove doctor accounts."
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add doctor
          </Button>
        }
      />

      <div className="card mb-6 p-4">
        <Input
          placeholder="Search doctors…"
          icon={<Search className="h-4 w-4" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No doctors yet"
          description="Add your first doctor to start accepting bookings."
          action={<Button onClick={openAdd}>Add doctor</Button>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const online = isDoctorOnline(d);
            const onDuty = isOnDutyNow(d);
            return (
            <Card key={d.uid} className="flex flex-col">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar name={d.name} src={d.photoURL} size="lg" />
                  <span
                    title={online ? "Online" : "Offline"}
                    className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-surface ${
                      online ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display font-bold text-ink">
                    {d.name}
                  </h3>
                  <p className="text-sm text-brand-600">{d.specialization}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-muted">
                    <Mail className="h-3 w-3" /> {d.email}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge tone={online ? "green" : "gray"} dot>
                    {online ? "Online" : "Offline"}
                  </Badge>
                  {!d.active && <Badge tone="gray">Inactive</Badge>}
                </div>
              </div>

              <div className="mt-2 text-xs text-ink-muted">
                {online ? (
                  "Active in panel now"
                ) : d.lastSeenAt ? (
                  <>Last seen {relativeTime(d.lastSeenAt)}</>
                ) : (
                  "Never signed in"
                )}
              </div>

              {!online && onDuty && (
                <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Scheduled on duty now but offline
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-surface-muted pt-3 text-sm">
                <span className="flex items-center gap-1 text-ink-muted">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {d.rating?.toFixed(1) ?? "New"}
                </span>
                <span className="font-semibold text-ink">
                  {formatCurrency(d.fees, d.currency ?? "USD")}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive(d)}
                  className={d.active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}
                >
                  <Power className="h-3.5 w-3.5" />
                  {d.active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-rose-500 hover:bg-rose-50"
                  onClick={() => setRemoveTarget(d)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {/* Add / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        title={editing ? "Edit doctor" : "Add new doctor"}
        description={
          editing
            ? "Update this doctor's professional details."
            : "Create a login and profile. The doctor signs in with these credentials."
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Save changes" : "Create doctor"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <ImageUploader
              value={form.photoURL}
              onUploaded={(url) => setForm((f) => ({ ...f, photoURL: url }))}
              folder="profiles"
              variant="avatar"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={set("name")} required />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={set("email")}
              disabled={!!editing}
              hint={editing ? "Email can't be changed" : undefined}
              required
            />
            {!editing && (
              <Input
                label="Temporary password"
                type="text"
                value={form.password}
                onChange={set("password")}
                hint="Share this with the doctor; they can change it later."
                required
              />
            )}
            <Input label="Phone" value={form.phone} onChange={set("phone")} />
            <Input
              label="Specialization"
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
              value={form.qualifications}
              onChange={set("qualifications")}
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
          <Textarea label="Bio" value={form.bio} onChange={set("bio")} />

          <div className="rounded-2xl border border-surface-muted bg-surface-subtle p-4">
            <div className="flex items-center gap-2">
              <Stamp className="h-4 w-4 text-brand-500" />
              <h4 className="text-sm font-bold text-ink">Signature stamp</h4>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              This doctor's personal stamp/signature. It's printed on the
              bottom-right of every prescription they issue (next to the company
              seal). Upload a transparent PNG for the cleanest result.
            </p>
            <div className="mt-3">
              <ImageUploader
                value={form.stampUrl}
                onUploaded={(url) => setForm((f) => ({ ...f, stampUrl: url }))}
                folder="stamps"
                hint="Signature / stamp image — PNG with transparency works best"
              />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        loading={busy}
        title="Remove doctor?"
        message={`This deletes ${removeTarget?.name}'s profile. Their login record in Firebase Auth should be removed from the console.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
