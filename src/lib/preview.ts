import { useEffect, useState } from 'preact/hooks';
import type { CodecId } from '../codecs/types';
import { decodeJxlBytes, canPreviewFromSourceBlob } from './decode';

/**
 * Returns an object URL the browser can render directly. Most codecs (jpeg,
 * webp, avif, png) decode natively from `<img>`. JXL doesn't in Chrome /
 * Firefox, so we transcode JXL → ImageData → PNG blob → object URL.
 */
export async function getRenderablePreviewUrl(blob: Blob, codec: CodecId): Promise<string> {
  if (codec !== 'jxl') {
    return URL.createObjectURL(blob);
  }
  const bytes = await blob.arrayBuffer();
  const imageData = await decodeJxlBytes(bytes);
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for JXL preview');
  ctx.putImageData(imageData, 0, 0);
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(pngBlob);
}

/** Render decoded RGBA pixels to a PNG object URL — used to preview source
 * formats the browser can't draw directly (HEIC/HEIF). */
export async function imageDataToPngBlobUrl(imageData: ImageData): Promise<string> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for preview');
  ctx.putImageData(imageData, 0, 0);
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(pngBlob);
}

interface SharedPng {
  promise: Promise<string>;
  refs: number;
  releaseTimer: number | null;
}

const pngByImage = new WeakMap<ImageData, SharedPng>();
/** Leaving the Editor unmounts one view just before mounting the next, so hold
 * a released PNG briefly instead of paying for a full re-encode. */
const PNG_RELEASE_DELAY_MS = 5000;
/** Renders as a broken image, which beats a spinner that never ends. */
const UNRENDERABLE_URL = 'data:,';

function acquirePng(imageData: ImageData): SharedPng {
  let entry = pngByImage.get(imageData);
  if (!entry) {
    const created: SharedPng = {
      promise: imageDataToPngBlobUrl(imageData),
      refs: 0,
      releaseTimer: null,
    };
    // A failure shouldn't stick: the next mount gets to try again.
    created.promise.catch(() => pngByImage.delete(imageData));
    pngByImage.set(imageData, created);
    entry = created;
  }
  if (entry.releaseTimer !== null) {
    window.clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
  }
  entry.refs++;
  return entry;
}

function releasePng(imageData: ImageData, entry: SharedPng): void {
  entry.refs--;
  if (entry.refs > 0) return;
  entry.releaseTimer = window.setTimeout(() => {
    if (pngByImage.get(imageData) === entry) pngByImage.delete(imageData);
    entry.promise.then(URL.revokeObjectURL, () => undefined);
  }, PNG_RELEASE_DELAY_MS);
}

/**
 * Object URL for showing the *original* image. Natively-renderable sources use
 * a direct blob URL; for HEIC/HEIF we fall back to the decoded pixels. Returns
 * `null` until ready (a frame or two for the HEIC case). Revokes on cleanup.
 */
export function useRenderableSourceUrl(
  blob: Blob,
  filename: string,
  imageData: ImageData,
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    let release: (() => void) | null = null;
    if (canPreviewFromSourceBlob(blob.type, filename)) {
      created = URL.createObjectURL(blob);
      setUrl(created);
    } else {
      const entry = acquirePng(imageData);
      release = () => releasePng(imageData, entry);
      entry.promise.then(
        (u) => {
          if (!cancelled) setUrl(u);
        },
        (err) => {
          console.error('Failed to build source preview', err);
          if (!cancelled) setUrl(UNRENDERABLE_URL);
        },
      );
    }
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
      release?.();
    };
  }, [blob, filename, imageData]);
  return url;
}
