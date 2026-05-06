import { signal } from '@preact/signals';
import type { CodecId } from '../codecs/types';
import { CODEC_IDS } from '../codecs/registry';
import { loadStoredStats, persistStats } from './persistence';

export interface FormatStat {
  count: number;
  bytesIn: number;
  bytesOut: number;
}

export interface GlobalStats {
  totalCompressions: number;
  totalBytesIn: number;
  totalBytesOut: number;
  /** Cumulative bytesIn − bytesOut. May be negative — output can be larger
   * than input (e.g., re-encoding a small JPEG to lossless WebP). */
  totalBytesSaved: number;
  byFormat: Record<CodecId, FormatStat>;
  firstUsedAt: number | null;
  lastUsedAt: number | null;
}

function emptyStats(): GlobalStats {
  const byFormat = {} as Record<CodecId, FormatStat>;
  for (const c of CODEC_IDS) byFormat[c] = { count: 0, bytesIn: 0, bytesOut: 0 };
  return {
    totalCompressions: 0,
    totalBytesIn: 0,
    totalBytesOut: 0,
    totalBytesSaved: 0,
    byFormat,
    firstUsedAt: null,
    lastUsedAt: null,
  };
}

function withMissingFormats(stats: GlobalStats): GlobalStats {
  // If a new codec is added between sessions, the loaded stats might lack
  // its FormatStat entry. Fill in defaults so reads are safe.
  const byFormat = { ...stats.byFormat };
  for (const c of CODEC_IDS) {
    if (!byFormat[c]) byFormat[c] = { count: 0, bytesIn: 0, bytesOut: 0 };
  }
  return { ...stats, byFormat };
}

const initial = loadStoredStats();
export const stats = signal<GlobalStats>(initial ? withMissingFormats(initial) : emptyStats());

let saveTimer: number | null = null;
function scheduleSave(): void {
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    persistStats(stats.peek());
  }, 200);
}

export function recordCompression(codec: CodecId, bytesIn: number, bytesOut: number): void {
  const now = Date.now();
  const cur = stats.peek();
  const fmt = cur.byFormat[codec] ?? { count: 0, bytesIn: 0, bytesOut: 0 };
  stats.value = {
    ...cur,
    totalCompressions: cur.totalCompressions + 1,
    totalBytesIn: cur.totalBytesIn + bytesIn,
    totalBytesOut: cur.totalBytesOut + bytesOut,
    totalBytesSaved: cur.totalBytesSaved + (bytesIn - bytesOut),
    byFormat: {
      ...cur.byFormat,
      [codec]: {
        count: fmt.count + 1,
        bytesIn: fmt.bytesIn + bytesIn,
        bytesOut: fmt.bytesOut + bytesOut,
      },
    },
    firstUsedAt: cur.firstUsedAt ?? now,
    lastUsedAt: now,
  };
  scheduleSave();
}

export function clearStats(): void {
  stats.value = emptyStats();
  scheduleSave();
}
