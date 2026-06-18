import { signal } from '@preact/signals';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import type { CropRect } from '../lib/crop';

export type ImageStatus = 'queued' | 'encoding' | 'done' | 'error';

export interface EncodedResult {
  bytes: number;
  blob: Blob;
  codec: CodecId;
  msElapsed: number;
}

/** Target output dimensions in pixels. Aspect ratio is always preserved by
 * the UI; this is just the resolved size applied after crop, before encode. */
export interface ResizeTarget {
  width: number;
  height: number;
}

export interface ImageItem {
  id: string;
  filename: string;
  originalBytes: number;
  originalImageData: ImageData;
  originalBlob: Blob;
  /** Per-image codec choice. New images inherit from the global default in
   * `state/settings.ts`. The Editor mutates only this image's codec; the
   * Queue sidebar and "Apply to all" mutate every image's codec. */
  codec: CodecId;
  options: Record<string, unknown>;
  crop?: CropRect;
  /** Optional resize applied after crop. Absent = keep (post-crop) size. */
  resize?: ResizeTarget;
  /** Set when codec/options came from a preset. Cleared on any manual edit
   * to codec/options so we don't credit usage to a preset that no longer
   * matches what was actually encoded. */
  presetId?: string;
  status: ImageStatus;
  encoded?: EncodedResult;
  error?: string;
}

export const images = signal<ImageItem[]>([]);
export const selectedImageId = signal<string | null>(null);

let nextId = 1;
export function nextImageId(): string {
  return `img-${nextId++}`;
}

export function addImage(
  item: Omit<ImageItem, 'id' | 'status'>,
): ImageItem {
  const next: ImageItem = { ...item, id: nextImageId(), status: 'queued' };
  images.value = [...images.value, next];
  return next;
}

export function updateImage(id: string, patch: Partial<ImageItem>): void {
  images.value = images.value.map((img) => (img.id === id ? { ...img, ...patch } : img));
}

export function removeImage(id: string): void {
  images.value = images.value.filter((img) => img.id !== id);
  if (selectedImageId.value === id) selectedImageId.value = null;
}

export function clearImages(): void {
  images.value = [];
  selectedImageId.value = null;
}

export function selectImage(id: string | null): void {
  selectedImageId.value = id;
}

export function setCrop(id: string, crop: CropRect | undefined): void {
  updateImage(id, { crop, encoded: undefined, status: 'queued' });
}

export function setResize(id: string, resize: ResizeTarget | undefined): void {
  updateImage(id, { resize, encoded: undefined, status: 'queued' });
}

/** Apply a scale multiplier to every image, relative to each image's own
 * (post-crop) base size. `1` clears any resize. Caller schedules re-encode. */
export function applyResizeMultiplierToAll(multiplier: number): void {
  images.value = images.value.map((img) => {
    const baseW = img.crop ? img.crop.width : img.originalImageData.width;
    const baseH = img.crop ? img.crop.height : img.originalImageData.height;
    const resize: ResizeTarget | undefined =
      multiplier === 1
        ? undefined
        : {
            width: Math.max(1, Math.round(baseW * multiplier)),
            height: Math.max(1, Math.round(baseH * multiplier)),
          };
    return { ...img, resize, encoded: undefined, status: 'queued' as const };
  });
}

export function getImage(id: string | null): ImageItem | null {
  if (!id) return null;
  return images.value.find((img) => img.id === id) ?? null;
}

/** Per-image codec change. Resets options to that codec's defaults so the
 * stale option keys (which differ between codecs) don't carry over. Also
 * clears presetId — manual edits invalidate the preset link. */
export function setImageCodec(id: string, codec: CodecId): void {
  updateImage(id, {
    codec,
    options: { ...CODECS[codec].defaults },
    presetId: undefined,
    encoded: undefined,
    status: 'queued',
  });
}

export function setImageOptions(id: string, options: Record<string, unknown>): void {
  updateImage(id, { options, presetId: undefined, encoded: undefined, status: 'queued' });
}

/** Atomic codec + options update — used by the Editor's Apply button so
 * the codec swap and the user's option choices land in a single signal
 * update (avoids a transient state where options reset to the new codec's
 * defaults before the user's choices are reapplied). */
export function setImageCodecAndOptions(
  id: string,
  codec: CodecId,
  options: Record<string, unknown>,
): void {
  updateImage(id, {
    codec,
    options: { ...options },
    presetId: undefined,
    encoded: undefined,
    status: 'queued',
  });
}
