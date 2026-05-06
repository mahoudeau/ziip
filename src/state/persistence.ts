import type { Preset } from './presets';

const SCHEMA_VERSION = 1;
const KEY_PREFIX = 'ziip.';

const KEY_SCHEMA = `${KEY_PREFIX}schemaVersion`;
const KEY_PRESETS = `${KEY_PREFIX}presets`;

interface PresetWire {
  id: unknown;
  name: unknown;
  codec: unknown;
  options: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  useCount?: unknown;
  bytesIn?: unknown;
  bytesOut?: unknown;
  bytesSaved?: unknown;
}

const VALID_CODEC_IDS = new Set(['mozjpeg', 'webp', 'avif', 'jxl', 'oxipng']);

function isValidPreset(raw: unknown): raw is Preset {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as PresetWire;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.codec === 'string' &&
    VALID_CODEC_IDS.has(p.codec) &&
    typeof p.options === 'object' &&
    p.options !== null &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number'
  );
}

function normalize(raw: unknown): Preset | null {
  if (!isValidPreset(raw)) return null;
  return {
    id: raw.id,
    name: raw.name,
    codec: raw.codec,
    options: raw.options as Record<string, unknown>,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    useCount: typeof raw.useCount === 'number' ? raw.useCount : 0,
    bytesIn: typeof raw.bytesIn === 'number' ? raw.bytesIn : 0,
    bytesOut: typeof raw.bytesOut === 'number' ? raw.bytesOut : 0,
    bytesSaved: typeof raw.bytesSaved === 'number' ? raw.bytesSaved : 0,
  };
}

export function loadStoredPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(KEY_PRESETS);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalize).filter((p): p is Preset => p !== null);
  } catch (err) {
    console.warn('Failed to load presets from localStorage', err);
    return [];
  }
}

export function persistPresets(list: Preset[]): void {
  try {
    localStorage.setItem(KEY_PRESETS, JSON.stringify(list));
    localStorage.setItem(KEY_SCHEMA, String(SCHEMA_VERSION));
  } catch (err) {
    console.warn('Failed to persist presets', err);
  }
}
