import { signal } from '@preact/signals';
import type { CropRect } from '../lib/crop';

export interface ImageItem {
  filename: string;
  originalBytes: number;
  originalImageData: ImageData;
  originalBlob: Blob;
  crop?: CropRect;
}

export interface EncodedResult {
  bytes: number;
  blob: Blob;
  msElapsed: number;
}

export const currentImage = signal<ImageItem | null>(null);
export const encoded = signal<EncodedResult | null>(null);
export const encoding = signal(false);

export function loadImage(item: ImageItem): void {
  currentImage.value = item;
  encoded.value = null;
}

export function clearImage(): void {
  currentImage.value = null;
  encoded.value = null;
}

export function setCrop(crop: CropRect | undefined): void {
  const img = currentImage.value;
  if (!img) return;
  currentImage.value = { ...img, crop };
  encoded.value = null;
}
