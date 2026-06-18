import { useEffect, useState } from 'preact/hooks';
import { importImageFiles } from '../lib/importImages';
import { applyResizeMultiplierToAll, clearImages, decodingCount, images } from '../state/images';
import { scheduleEncodeAll } from '../state/encode';
import { Spinner } from './ui/Spinner';
import { applyToAll, codec, options } from '../state/settings';
import {
  pendingByCodec,
  resetPendingOptions as resetDraftFor,
  setPendingOptions as setDraftFor,
} from '../state/draft';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { QueueItem } from './QueueItem';
import { CodecPicker } from './CodecPicker';
import { CodecOptionsPanel } from './CodecOptionsPanel';
import { PresetsPanel } from './PresetsPanel';
import { PresetSaveModal } from './PresetSaveModal';
import { ApplyButton } from './ui/ApplyButton';
import { applyPresetToAll, getDefaultPreset } from '../state/presets';

export function Queue() {
  const items = images.value;
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Land on the Presets tab when a default preset is set, so the user sees
  // straight away what's being applied to incoming images.
  const [showingPresets, setShowingPresets] = useState(() => !!getDefaultPreset());
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Picker selection. Options come from the shared draft signal so they
  // persist across page reloads and stay in sync between Queue + Editor.
  const currentCodec = codec.value;
  const currentOptions = options.value;
  const [pendingCodec, setPendingCodec] = useState<CodecId>(currentCodec);
  useEffect(() => {
    setPendingCodec(currentCodec);
  }, [currentCodec]);
  const draft = pendingByCodec.value;
  const pendingOptions = draft[pendingCodec];
  const pendingMeta = CODECS[pendingCodec];
  const optsSig = JSON.stringify(currentOptions);
  const isApplied = pendingCodec === currentCodec && JSON.stringify(pendingOptions) === optsSig;
  const isAtDefaults =
    JSON.stringify(pendingOptions) === JSON.stringify(CODECS[pendingCodec].defaults);
  function setPendingOptions(o: Record<string, unknown>) {
    setDraftFor(pendingCodec, o);
  }
  function resetPendingOptions() {
    resetDraftFor(pendingCodec);
  }

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const err = await importImageFiles(files);
    if (err) setError(err);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files.length) void handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      class={`min-h-full ${isDragging ? 'ring-2 ring-brand ring-inset' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <div class="grid lg:grid-cols-[1fr_400px] gap-6 max-w-7xl mx-auto items-start">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-lg font-semibold flex items-center gap-2">
              {items.length} image{items.length === 1 ? '' : 's'}
              {decodingCount.value > 0 && (
                <span
                  role="status"
                  aria-live="polite"
                  class="flex items-center gap-1.5 text-sm font-normal text-muted"
                >
                  <Spinner size={13} /> decoding {decodingCount.value}…
                </span>
              )}
            </h1>
            <div class="flex items-center gap-2">
              {confirmingClear ? (
                <>
                  <button
                    autofocus
                    class="px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
                    onClick={() => {
                      clearImages();
                      setConfirmingClear(false);
                    }}
                  >
                    Confirm clear
                  </button>
                  <button
                    class="px-3 py-1.5 text-sm text-faint hover:text-ink transition-colors"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  class="px-3 py-1.5 text-sm text-muted hover:text-red-600 transition-colors"
                  onClick={() => setConfirmingClear(true)}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          {error && <p class="mb-4 text-sm text-red-600">{error}</p>}
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => (
              <QueueItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <aside class="bg-surface rounded-xl p-6 space-y-6 self-start lg:sticky lg:top-6">
          <div>
            <p class="text-xs uppercase tracking-wide text-faint font-medium">Settings</p>
            <p class="text-xs text-muted mt-1">Apply to every image in the queue.</p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">Resize all</p>
            <div class="flex flex-wrap gap-1.5">
              {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    applyResizeMultiplierToAll(m);
                    scheduleEncodeAll();
                  }}
                  class="px-2 py-1 text-xs rounded tabular-nums bg-elevated text-muted hover:bg-border transition-colors"
                  title={m === 1 ? 'Reset to original size' : `Scale every image ×${m}`}
                >
                  {m === 1 ? 'Original' : `×${m}`}
                </button>
              ))}
            </div>
            <p class="text-xs text-faint">Scales each image by the multiplier · aspect locked</p>
          </div>

          <CodecPicker
            value={pendingCodec}
            showingPresets={showingPresets}
            onSelectCodec={(c) => {
              setShowingPresets(false);
              setPendingCodec(c);
            }}
            onSelectPresets={() => setShowingPresets(true)}
          />

          {showingPresets ? (
            <PresetsPanel
              onApply={(pid) => applyPresetToAll(pid)}
              applyLabel="Apply to all images"
              activePresetId={getDefaultPreset()?.id}
              appliedPresetId={(() => {
                const all = items;
                if (all.length === 0) return undefined;
                const first = all[0]?.presetId;
                if (!first) return undefined;
                return all.every((i) => i.presetId === first) ? first : undefined;
              })()}
            />
          ) : (
            <>
              <CodecOptionsPanel
                meta={pendingMeta}
                values={pendingOptions}
                onChange={setPendingOptions}
              />
              <div class="flex gap-2">
                <ApplyButton
                  isApplied={isApplied}
                  applyLabel={`Apply ${pendingMeta.name} to all`}
                  onClick={() => applyToAll(pendingCodec, pendingOptions)}
                />
                <button
                  type="button"
                  onClick={resetPendingOptions}
                  disabled={isAtDefaults}
                  class="px-3 py-1.5 text-sm rounded text-muted hover:text-ink hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Reset this format's options to defaults"
                >
                  Reset
                </button>
              </div>
              <div class="pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSavePresetOpen(true)}
                  class="w-full text-xs text-muted hover:text-ink py-1.5 px-2 rounded border border-border hover:border-border transition-colors"
                >
                  Save current settings as preset…
                </button>
              </div>
            </>
          )}

          {savePresetOpen && (
            <PresetSaveModal
              codec={pendingCodec}
              options={pendingOptions}
              onClose={() => setSavePresetOpen(false)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
