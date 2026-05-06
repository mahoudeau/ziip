import { signal } from '@preact/signals';
import { CODEC_IDS, CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { loadStoredDraft, persistDraft } from './persistence';

/** Per-codec options the user is configuring (the "draft" / pending state).
 * Shared between the Editor and Queue settings panels and persisted to
 * localStorage so refreshes don't blow it away. */
function buildInitialDraft(): Record<CodecId, Record<string, unknown>> {
  const stored = loadStoredDraft();
  const init = {} as Record<CodecId, Record<string, unknown>>;
  for (const c of CODEC_IDS) {
    const fromStorage = stored[c];
    init[c] =
      fromStorage && typeof fromStorage === 'object'
        ? { ...CODECS[c].defaults, ...fromStorage }
        : { ...CODECS[c].defaults };
  }
  return init;
}

export const pendingByCodec = signal<Record<CodecId, Record<string, unknown>>>(
  buildInitialDraft(),
);

let saveTimer: number | null = null;
function scheduleSave(): void {
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    persistDraft(pendingByCodec.peek());
  }, 200);
}

export function setPendingOptions(codec: CodecId, options: Record<string, unknown>): void {
  pendingByCodec.value = { ...pendingByCodec.value, [codec]: { ...options } };
  scheduleSave();
}

export function resetPendingOptions(codec: CodecId): void {
  pendingByCodec.value = {
    ...pendingByCodec.value,
    [codec]: { ...CODECS[codec].defaults },
  };
  scheduleSave();
}
