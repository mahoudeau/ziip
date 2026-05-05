import { signal } from '@preact/signals';
import type { CodecId } from '../codecs/types';
import type { CropRect } from '../lib/crop';

export type ImageStatus = 'queued' | 'encoding' | 'done' | 'error';

export interface EncodedResult {
  bytes: number;
  blob: Blob;
  codec: CodecId;
  msElapsed: number;
}

export interface ImageItem {
  id: string;
  filename: string;
  originalBytes: number;
  originalImageData: ImageData;
  originalBlob: Blob;
  crop?: CropRect;
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

export function addImage(item: Omit<ImageItem, 'id' | 'status'>): ImageItem {
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

export function getImage(id: string | null): ImageItem | null {
  if (!id) return null;
  return images.value.find((img) => img.id === id) ?? null;
}
