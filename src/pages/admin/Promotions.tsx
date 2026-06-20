import { useState } from "react";
import { Plus, Megaphone, Pencil, Trash2, Power } from "lucide-react";
import toast from "react-hot-toast";
import { useAsync } from "@/hooks/useAsync";
import {
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { PromotionCard } from "@/components/shared/PromotionCard";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { PageLoader, EmptyState } from "@/components/ui/Misc";
import type { Promotion, PromotionType } from "@/types";

const empty = {
  type: "promo" as PromotionType,
  title: "",
  description: "",
  imageUrl: "",
  expiresAt: "",
  active: true,
};

export default function AdminPromotions() {
  const { data, loading, reload } = useAsync(() => listPromotions(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Promotion | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: any) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function openNew() {
    setForm({ ...empty });
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: Promotion) {
    setForm({
      type: p.type,
      title: p.title,
      description: p.description,
      imageUrl: p.imageUrl ?? "",
      expiresAt: p.expiresAt ?? "",
      active: p.active,
    });
    setEditing(p);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl,
        expiresAt: form.expiresAt,
        active: form.active,
        doctorIds: [],
      };
      if (editing) {
        await updatePromotion(editing.id, payload);
        toast.success("Promotion updated");
      } else {
        await createPromotion(payload);
        toast.success("Promotion published");
      }
      setOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Promotion) {
    await updatePromotion(p.id, { active: !p.active });
    reload();
  }

  async function remove() {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await deletePromotion(removeTarget.id);
      toast.success("Promotion deleted");
      setRemoveTarget(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Promotions & campaigns"
        subtitle="Broadcast special offers and free-consultation campaigns to patients."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New promotion
          </Button>
        }
      />

      {!data || data.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No promotions yet"
          description="Create your first offer or free-consultation campaign."
          action={<Button onClick={openNew}>Create promotion</Button>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <PromotionCard
              key={p.id}
              promo={p}
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggle(p)}
                    className={p.active ? "text-amber-600" : "text-emerald-600"}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {p.active ? "Pause" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-rose-500 hover:bg-rose-50"
                    onClick={() => setRemoveTarget(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit promotion" : "New promotion"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Save" : "Publish"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Type" value={form.type} onChange={set("type")}>
            <option value="promo">Special offer</option>
            <option value="free_campaign">Free consultation campaign</option>
          </Select>
          <Input
            label="Title"
            placeholder="e.g. 20% off first consultation"
            value={form.title}
            onChange={set("title")}
            required
          />
          <Textarea
            label="Description"
            placeholder="Describe the offer or campaign…"
            value={form.description}
            onChange={set("description")}
            required
          />
          <Input
            label="Expires on (optional)"
            type="date"
            value={form.expiresAt}
            onChange={set("expiresAt")}
          />
          <ImageUploader
            label="Banner image (optional)"
            value={form.imageUrl}
            onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            folder="promotions"
            hint="A nice banner makes the offer pop"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete promotion?"
        message="This permanently removes the promotion. This can't be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
