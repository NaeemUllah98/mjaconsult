import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  PlayCircle,
  Save,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { listBanners, saveBanners } from "@/lib/api";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Misc";
import type { Banner, BannerMediaType } from "@/types";

const EMPTY_FORM: Omit<Banner, "id" | "createdAt"> = {
  type: "image",
  url: "",
  title: "",
  subtitle: "",
  link: "",
  linkLabel: "",
  active: true,
  order: 1,
};

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

interface BannerFormProps {
  initial: Omit<Banner, "id" | "createdAt">;
  onSave: (data: Omit<Banner, "id" | "createdAt">) => void;
  onClose: () => void;
}

function BannerForm({ initial, onSave, onClose }: BannerFormProps) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleFilePick(file: File) {
    if (!isCloudinaryConfigured) {
      toast.error("Cloudinary is not configured — paste a URL instead.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await uploadImage(file, "banners", setUploadProgress);
      set("url", res.url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function validate(): string | null {
    if (!form.url.trim()) return "URL is required.";
    if (form.type === "video" && !extractYouTubeId(form.url.trim()))
      return "Please enter a valid YouTube URL.";
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) { toast.error(err); return; }
    onSave({ ...form, url: form.url.trim(), order: Number(form.order) || 1 });
  }

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div>
        <span className="mb-2 block text-sm font-medium text-ink-soft">Banner type</span>
        <div className="flex gap-3">
          {(["image", "video"] as BannerMediaType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition ${
                form.type === t
                  ? "border-brand-400 bg-brand-50 text-brand-700"
                  : "border-surface-muted text-ink-soft hover:border-brand-300"
              }`}
            >
              {t === "image" ? (
                <ImageIcon className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {t === "image" ? "Image" : "YouTube video"}
            </button>
          ))}
        </div>
      </div>

      {/* URL / upload */}
      {form.type === "image" ? (
        <div className="space-y-2">
          <Input
            label="Image URL"
            placeholder="https://... or upload below"
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 py-3 text-sm font-medium text-brand-700 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
          >
            {uploading ? (
              <>Uploading… {uploadProgress}%</>
            ) : (
              <><ImageIcon className="h-4 w-4" /> Upload image from device</>
            )}
          </button>
          {form.url && (
            <img
              src={form.url}
              alt="preview"
              className="mt-1 max-h-40 w-full rounded-xl object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </div>
      ) : (
        <Input
          label="YouTube URL"
          placeholder="https://www.youtube.com/watch?v=..."
          value={form.url}
          onChange={(e) => set("url", e.target.value)}
          hint={
            form.url && extractYouTubeId(form.url)
              ? `✓ Video ID: ${extractYouTubeId(form.url)}`
              : undefined
          }
        />
      )}

      {/* Text overlay */}
      <Input
        label="Title (overlay, optional)"
        placeholder="e.g. Free Heart Health Campaign"
        value={form.title ?? ""}
        onChange={(e) => set("title", e.target.value)}
      />
      <Textarea
        label="Subtitle (overlay, optional)"
        placeholder="e.g. Consult Dr. Sarah Khan for free every Friday this month."
        value={form.subtitle ?? ""}
        onChange={(e) => set("subtitle", e.target.value)}
        rows={2}
      />

      {/* CTA */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="CTA link (optional)"
          placeholder="/register"
          value={form.link ?? ""}
          onChange={(e) => set("link", e.target.value)}
        />
        <Input
          label="CTA label"
          placeholder="Learn more"
          value={form.linkLabel ?? ""}
          onChange={(e) => set("linkLabel", e.target.value)}
        />
      </div>

      {/* Order + active */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Display order"
          type="number"
          min={1}
          value={form.order}
          onChange={(e) => set("order", Number(e.target.value))}
        />
        <div className="flex flex-col justify-end">
          <label className="flex cursor-pointer items-center gap-2.5">
            <span className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: form.active ? "var(--color-brand-500, #0891b2)" : "#d1d5db" }}>
              <span
                className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow transition-transform"
                style={{ transform: form.active ? "translateX(1.375rem)" : "translateX(0.25rem)" }}
              />
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            <span className="text-sm font-medium text-ink-soft">Active</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" /> Save banner
        </Button>
      </div>
    </div>
  );
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  useEffect(() => {
    listBanners().then(setBanners);
  }, []);

  if (!banners) return <PageLoader />;

  async function persist(updated: Banner[]) {
    const sorted = [...updated].sort((a, b) => a.order - b.order);
    setBanners(sorted);
    setSaving(true);
    try {
      await saveBanners(sorted);
      toast.success("Banners saved");
    } catch {
      toast.error("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setModalOpen(true);
  }

  function handleFormSave(data: Omit<Banner, "id" | "createdAt">) {
    let updated: Banner[];
    if (editing) {
      updated = banners!.map((b) =>
        b.id === editing.id ? { ...b, ...data } : b,
      );
    } else {
      const newBanner: Banner = {
        ...data,
        id: `banner-${Date.now()}`,
        createdAt: new Date(),
      };
      updated = [...banners!, newBanner];
    }
    persist(updated);
    setModalOpen(false);
  }

  function toggleActive(id: string) {
    persist(banners!.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  }

  function remove(id: string) {
    if (!confirm("Delete this banner?")) return;
    persist(banners!.filter((b) => b.id !== id));
  }

  function move(id: string, direction: -1 | 1) {
    const sorted = [...banners!].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((b) => b.id === id);
    const j = i + direction;
    if (j < 0 || j >= sorted.length) return;
    const reordered = sorted.map((b, idx) => {
      if (idx === i) return { ...b, order: sorted[j].order };
      if (idx === j) return { ...b, order: sorted[i].order };
      return b;
    });
    persist(reordered);
  }

  const initialForm: Omit<Banner, "id" | "createdAt"> = editing
    ? { type: editing.type, url: editing.url, title: editing.title ?? "", subtitle: editing.subtitle ?? "", link: editing.link ?? "", linkLabel: editing.linkLabel ?? "", active: editing.active, order: editing.order }
    : { ...EMPTY_FORM, order: banners.length + 1 };

  return (
    <div>
      <PageHeader
        title="Homepage Banners"
        subtitle="Manage the banner/video slideshow displayed at the top of the public landing page."
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add banner
          </Button>
        }
      />

      {banners.length === 0 ? (
        <Card className="py-16 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-ink-muted" />
          <p className="mt-3 font-display font-bold text-ink">No banners yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add your first banner — image or YouTube video — to display it on the homepage.
          </p>
          <div className="mt-5">
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add banner
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((b, i) => (
            <Card key={b.id} className="flex items-center gap-4 p-3">
              {/* Thumbnail */}
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-subtle">
                {b.type === "image" ? (
                  <img
                    src={b.url}
                    alt={b.title ?? ""}
                    className="h-full w-full object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-gradient text-white">
                    <PlayCircle className="h-7 w-7" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold text-ink truncate">
                    {b.title || <span className="italic text-ink-muted">Untitled</span>}
                  </span>
                  <Badge tone={b.active ? "green" : "gray"}>
                    {b.active ? "Active" : "Hidden"}
                  </Badge>
                  <Badge tone="gray">
                    {b.type === "image" ? "Image" : "Video"}
                  </Badge>
                </div>
                {b.subtitle && (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">{b.subtitle}</p>
                )}
                <p className="mt-0.5 truncate text-xs text-ink-muted opacity-60">
                  {b.url}
                </p>
              </div>

              {/* Controls */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => move(b.id, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(b.id, 1)}
                  disabled={i === banners.length - 1}
                  title="Move down"
                  className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive(b.id)}
                  title={b.active ? "Hide banner" : "Show banner"}
                  className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle"
                >
                  {b.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => openEdit(b)}
                  title="Edit"
                  className="rounded-lg p-1.5 text-ink-muted transition hover:bg-surface-subtle"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(b.id)}
                  title="Delete"
                  className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {saving && (
        <p className="mt-3 text-center text-xs text-ink-muted">Saving…</p>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit banner" : "Add banner"}
        size="lg"
      >
        <BannerForm
          key={editing?.id ?? "new"}
          initial={initialForm}
          onSave={handleFormSave}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
