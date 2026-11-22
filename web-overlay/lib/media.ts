import { API, api, ApiError, friendlyStatus } from "@/lib/api";

/** A picture managed from Admin (hero slide, banner, gallery photo or brand asset). */
export type SiteMedia = {
  id: number;
  kind: "hero" | "banner" | "gallery" | "brand";
  group: string | null;
  url: string;
  srcset: string | null;
  thumb_url: string;
  mobile_url: string | null;
  mobile_srcset: string | null;
  /** True for a hero video; its cover picture (shown on phones and while it loads) is `mobile_url`. */
  is_video: boolean;
  width: number | null;
  height: number | null;
  alt: string | null;
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  cta_text: string | null;
  cta_url: string | null;
  position: string;
  duration_ms: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  status: "draft" | "published";
  sort_order: number;
};

export const MAX_UPLOAD_MB = 5;
export const MAX_VIDEO_MB = 30;
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** What visitors see. Never throws: an empty list means "use the built-in pictures". */
export const publicMedia = (kind: SiteMedia["kind"]) =>
  api<SiteMedia[]>(`/site-media?kind=${kind}`).catch(() => [] as SiteMedia[]);

/** Quick check before sending; the server checks again by looking inside the file. */
export function checkImage(file: File, allowVideo = false): string | null {
  if (allowVideo && VIDEO_TYPES.includes(file.type)) {
    return file.size > MAX_VIDEO_MB * 1024 * 1024 ? `${file.name}: the video is larger than ${MAX_VIDEO_MB} MB.` : null;
  }
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name}: only JPG, PNG or WebP pictures are allowed.`;
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `${file.name}: the picture is larger than ${MAX_UPLOAD_MB} MB.`;
  return null;
}

/** Upload with a progress percentage (fetch cannot report upload progress). */
export function sendForm<T>(path: string, token: string, form: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `${API}${path}`);
    x.setRequestHeader("Accept", "application/json");
    x.setRequestHeader("Authorization", `Bearer ${token}`);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    x.onerror = () => reject(new ApiError(0, "We can't reach the server right now. Check your internet connection and try again."));
    x.onload = () => {
      let j: { message?: string; errors?: Record<string, string[]> } = {};
      try { j = JSON.parse(x.responseText); } catch { /* not JSON */ }
      if (x.status >= 200 && x.status < 300) resolve(j as T);
      else if (x.status === 413) reject(new ApiError(413, `The picture is too big for the server. Use one under ${MAX_UPLOAD_MB} MB.`));
      else reject(new ApiError(x.status, friendlyStatus(x.status, j.message), j.errors ?? {}));
    };
    x.send(form);
  });
}

/** First message from an ApiError, preferring a field message the owner can act on. */
export const errorText = (e: unknown) => {
  if (e instanceof ApiError) {
    const first = Object.values(e.errors)[0]?.[0];
    return first ?? e.message;
  }
  return "Something went wrong. Please try again.";
};
