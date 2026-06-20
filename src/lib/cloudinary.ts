/**
 * Cloudinary unsigned upload helper (free tier).
 *
 * Setup (one-time):
 *  1. Create a free account at https://cloudinary.com
 *  2. Settings > Upload > Add upload preset > Signing Mode: "Unsigned"
 *  3. Put the cloud name + preset name in your .env file.
 *
 * Unsigned uploads keep your API secret OUT of the browser, which is the
 * correct, secure pattern for a client-only (free) app.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

/**
 * Upload an image File to Cloudinary and return its secure URL.
 * @param folder logical folder (e.g. "profiles", "payment-proofs")
 */
export async function uploadImage(
  file: File,
  folder = "mjaconsult",
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file.",
    );
  }

  // Basic client-side guardrails
  const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large. Please choose a file under 8 MB.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  // Use XHR so we can report upload progress.
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
        });
      } else {
        reject(new Error("Upload failed. Please try again."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}

/** Build a transformed (optimized) Cloudinary URL for display. */
export function optimized(url: string, width = 400): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
