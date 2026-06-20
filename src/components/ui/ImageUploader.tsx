import { useRef, useState } from "react";
import { UploadCloud, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadImage, optimized } from "@/lib/cloudinary";
import { cn } from "@/utils/cn";

interface ImageUploaderProps {
  value?: string;
  onUploaded: (url: string) => void;
  folder?: string;
  label?: string;
  /** "avatar" = round preview, "wide" = rectangular drop zone. */
  variant?: "avatar" | "wide";
  hint?: string;
}

export function ImageUploader({
  value,
  onUploaded,
  folder = "mjaconsult",
  label,
  variant = "wide",
  hint,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadImage(file, folder, setProgress);
      onUploaded(res.url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const onPick = () => inputRef.current?.click();

  return (
    <div className="w-full">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">
          {label}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {variant === "avatar" ? (
        <button
          type="button"
          onClick={onPick}
          className="group relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-2 border-dashed border-brand-200 bg-brand-50 transition hover:border-brand-400"
        >
          {value ? (
            <img
              src={optimized(value, 200)}
              alt="preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-brand-300" />
          )}
          <span className="absolute inset-0 grid place-items-center bg-ink/45 text-white opacity-0 transition group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
            value
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-brand-200 bg-brand-50/40 hover:border-brand-400 hover:bg-brand-50",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
              <span className="text-sm font-medium text-ink-soft">
                Uploading… {progress}%
              </span>
            </>
          ) : value ? (
            <>
              <img
                src={optimized(value, 320)}
                alt="preview"
                className="max-h-36 rounded-lg object-contain"
              />
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Uploaded — click to replace
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-brand-400" />
              <span className="text-sm font-semibold text-brand-700">
                Click to upload an image
              </span>
              <span className="text-xs text-ink-muted">
                {hint ?? "PNG, JPG up to 8 MB"}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
