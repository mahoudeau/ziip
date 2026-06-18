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
    if (canPreviewFromSourceBlob(blob.type, filename)) {
      created = URL.createObjectURL(blob);
      setUrl(created);
    } else {
      imageDataToPngBlobUrl(imageData).then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        created = u;
        setUrl(u);
      });
    }
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [blob, filename, imageData]);
  return url;
}
