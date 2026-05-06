import { signal } from '@preact/signals';
import type { CodecId } from '../codecs/types';
import { loadStoredPresets, persistPresets } from './persistence';
import { images, updateImage } from './images';
import { codec as defaultCodec, options as defaultOptions } from './settings';
import { scheduleEncodeAll, scheduleEncodeImage } from './encode';

export interface Preset {
  id: string;
  name: string;
  codec: CodecId;
  options: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  useCount: number;
  bytesIn: number;
  bytesOut: number;
  /** Cumulative bytesIn - bytesOut. Can be negative when output is larger
   * than input (e.g., re-encoding a small JPEG to lossless WebP). */
  bytesSaved: number;
}

export const presets = signal<Preset[]>(loadStoredPresets());

let saveTimer: number | null = null;
function scheduleSave(): void {
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    persistPresets(presets.peek());
  }, 200);
}

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPreset(id: string | undefined | null): Preset | null {
  if (!id) return null;
  return presets.peek().find((p) => p.id === id) ?? null;
}

export function findPresetByName(name: string): Preset | null {
  const trimmed = name.trim().toLowerCase();
  return presets.peek().find((p) => p.name.trim().toLowerCase() === trimmed) ?? null;
}

export function createPreset(
  name: string,
  codec: CodecId,
  options: Record<string, unknown>,
): Preset {
  const now = Date.now();
  const next: Preset = {
    id: uuid(),
    name,
    codec,
    options: { ...options },
    createdAt: now,
    updatedAt: now,
    useCount: 0,
    bytesIn: 0,
    bytesOut: 0,
    bytesSaved: 0,
  };
  presets.value = [...presets.value, next];
  scheduleSave();
  return next;
}

export function renamePreset(id: string, name: string): void {
  presets.value = presets.value.map((p) =>
    p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
  );
  scheduleSave();
}

export function overwritePreset(
  id: string,
  codec: CodecId,
  options: Record<string, unknown>,
): void {
  presets.value = presets.value.map((p) =>
    p.id === id
      ? { ...p, codec, options: { ...options }, updatedAt: Date.now() }
      : p,
  );
  scheduleSave();
}

export function deletePreset(id: string): void {
  presets.value = presets.value.filter((p) => p.id !== id);
  // Also clear the link from any image that referenced it.
  for (const img of images.peek()) {
    if (img.presetId === id) updateImage(img.id, { presetId: undefined });
  }
  scheduleSave();
}

export function applyPresetToImage(presetId: string, imageId: string): void {
  const preset = getPreset(presetId);
  if (!preset) return;
  updateImage(imageId, {
    codec: preset.codec,
    options: { ...preset.options },
    presetId: preset.id,
    encoded: undefined,
    status: 'queued',
  });
  scheduleEncodeImage(imageId);
}

export function applyPresetToAll(presetId: string): void {
  const preset = getPreset(presetId);
  if (!preset) return;
  // Also update the global default so newly-added images inherit the preset's
  // codec + options.
  defaultCodec.value = preset.codec;
  defaultOptions.value = { ...preset.options };
  for (const img of images.peek()) {
    updateImage(img.id, {
      codec: preset.codec,
      options: { ...preset.options },
      presetId: preset.id,
      encoded: undefined,
      status: 'queued',
    });
  }
  scheduleEncodeAll();
}

/** Increment usage counters after a successful compression. */
export function recordPresetUse(id: string, bytesIn: number, bytesOut: number): void {
  const found = presets.peek().find((p) => p.id === id);
  if (!found) return;
  presets.value = presets.value.map((p) =>
    p.id === id
      ? {
          ...p,
          useCount: p.useCount + 1,
          bytesIn: p.bytesIn + bytesIn,
          bytesOut: p.bytesOut + bytesOut,
          bytesSaved: p.bytesSaved + (bytesIn - bytesOut),
        }
      : p,
  );
  scheduleSave();
}
