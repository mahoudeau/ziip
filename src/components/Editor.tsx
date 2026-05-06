import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  getImage,
  removeImage,
  selectImage,
  selectedImageId,
  setCrop,
  setImageCodecAndOptions,
} from '../state/images';
import { applyToAll } from '../state/settings';
import {
  pendingByCodec,
  resetPendingOptions as resetDraftFor,
  setPendingOptions as setDraftFor,
} from '../state/draft';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { ApplyButton } from './ui/ApplyButton';
import { CodecPicker } from './CodecPicker';
import { CodecOptionsPanel } from './CodecOptionsPanel';
import { CompareSlider } from './CompareSlider';
import { CropTool } from './CropTool';
import { PresetsPanel } from './PresetsPanel';
import { PresetSaveModal } from './PresetSaveModal';
import { applyPresetToImage } from '../state/presets';
import type { CropRect } from '../lib/crop';
import { ASPECT_RATIOS, clampRect, cropImageData, normalizeRect } from '../lib/crop';
import { formatBytes, formatDeltaPct } from '../lib/format';
import { triggerBlobDownload } from '../lib/download';
import { getRenderablePreviewUrl } from '../lib/preview';
import { scheduleEncodeImage } from '../state/encode';
import { Spinner } from './ui/Spinner';

export function Editor() {
  const selectedId = selectedImageId.value;
  const item = getImage(selectedId);
  if (!item) return null;
  const {
    id,
    filename,
    originalImageData,
    originalBytes,
    originalBlob,
    crop,
    status,
    encoded,
    codec: codecId,
    options: opts,
    presetId,
  } = item;
  const meta = CODECS[codecId];

  const [cropMode, setCropMode] = useState(false);
  const [liveCropRect, setLiveCropRect] = useState<CropRect | null>(null);
  const [aspectId, setAspectId] = useState<string>('free');
  const [customW, setCustomW] = useState(16);
  const [customH, setCustomH] = useState(9);
  // If the image was added with a default preset (or had one applied),
  // start the sidebar on the Presets tab so the link is immediately visible.
  const [showingPresets, setShowingPresets] = useState(() => !!presetId);
  const [savePresetOpen, setSavePresetOpen] = useState(false);

  // Picker selection (which codec tab the user is on). Options come from
  // the shared `pendingByCodec` draft signal in state/draft.ts so they
  // survive page reloads.
  const [pendingCodec, setPendingCodec] = useState<CodecId>(codecId);
  useEffect(() => {
    setPendingCodec(codecId);
  }, [codecId]);
  const draft = pendingByCodec.value;
  const pendingOptions = draft[pendingCodec];
  const pendingMeta = CODECS[pendingCodec];
  const optsSig = JSON.stringify(opts);
  const isApplied = pendingCodec === codecId && JSON.stringify(pendingOptions) === optsSig;
  const isAtDefaults =
    JSON.stringify(pendingOptions) === JSON.stringify(CODECS[pendingCodec].defaults);
  function setPendingOptions(o: Record<string, unknown>) {
    setDraftFor(pendingCodec, o);
  }
  function resetPendingOptions() {
    resetDraftFor(pendingCodec);
  }
  const viewerApiRef = useRef<{ fit: () => void; zoom100: () => void } | null>(null);

  const aspectRatio = useMemo<number | null>(() => {
    if (aspectId === 'custom') {
      const w = Number(customW);
      const h = Number(customH);
      return w > 0 && h > 0 ? w / h : null;
    }
    return ASPECT_RATIOS.find((a) => a.id === aspectId)?.ratio ?? null;
  }, [aspectId, customW, customH]);

  const [originalUrl] = useState(() => URL.createObjectURL(originalBlob));
  useEffect(() => () => URL.revokeObjectURL(originalUrl), [originalUrl]);

  const effectiveImageData = useMemo(() => {
    return crop ? cropImageData(originalImageData, crop) : originalImageData;
  }, [originalImageData, crop]);

  const [croppedOriginalUrl, setCroppedOriginalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!crop) {
      setCroppedOriginalUrl(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    const canvas = new OffscreenCanvas(effectiveImageData.width, effectiveImageData.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(effectiveImageData, 0, 0);
    canvas.convertToBlob({ type: 'image/png' }).then((blob) => {
      if (cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setCroppedOriginalUrl(createdUrl);
    });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [effectiveImageData, crop]);

  const [encodedUrl, setEncodedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!encoded) {
      setEncodedUrl(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    getRenderablePreviewUrl(encoded.blob, encoded.codec)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setEncodedUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to build preview URL', err);
          setEncodedUrl(null);
        }
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [encoded]);

  const isEncoding = status === 'encoding' || status === 'queued';

  function downloadEncoded() {
    if (!encoded) return;
    const ext = CODECS[encoded.codec].outputExt;
    const dot = filename.lastIndexOf('.');
    const base = dot === -1 ? filename : filename.slice(0, dot);
    triggerBlobDownload(encoded.blob, `${base}.${ext}`);
  }

  function enterCropMode() {
    setLiveCropRect(crop ?? null);
    setCropMode(true);
  }

  function applyLiveCrop() {
    if (liveCropRect && liveCropRect.width >= 1 && liveCropRect.height >= 1) {
      setCrop(id, normalizeRect(liveCropRect));
    } else {
      setCrop(id, undefined);
    }
    scheduleEncodeImage(id);
    setCropMode(false);
  }

  function clearAppliedCrop() {
    setCrop(id, undefined);
    scheduleEncodeImage(id);
    setCropMode(false);
  }

  function backToQueue() {
    selectImage(null);
  }

  function removeAndBack() {
    removeImage(id);
  }

  // When the active aspect ratio changes, snap the live rect to it.
  useEffect(() => {
    if (aspectRatio == null) return;
    setLiveCropRect((prev) => {
      if (!prev || prev.width < 1 || prev.height < 1) return prev;
      const cx = prev.x + prev.width / 2;
      const cy = prev.y + prev.height / 2;
      const area = prev.width * prev.height;
      const newH = Math.sqrt(area / aspectRatio);
      const newW = newH * aspectRatio;
      return clampRect(
        normalizeRect({
          x: cx - newW / 2,
          y: cy - newH / 2,
          width: newW,
          height: newH,
        }),
        originalImageData.width,
        originalImageData.height,
      );
    });
  }, [aspectRatio, originalImageData.width, originalImageData.height]);

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target;
      const inInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target as HTMLElement | null)?.isContentEditable === true;

      if (inInput) {
        if (cropMode && e.key === 'Escape') {
          setCropMode(false);
          (target as HTMLElement).blur();
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        if (cropMode) setCropMode(false);
        else enterCropMode();
        e.preventDefault();
        return;
      }
      if (e.key === '0') {
        viewerApiRef.current?.fit();
        e.preventDefault();
        return;
      }
      if (e.key === '1') {
        viewerApiRef.current?.zoom100();
        e.preventDefault();
        return;
      }
      if (!cropMode) return;
      if (e.key === 'Escape') {
        setCropMode(false);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        applyLiveCrop();
        e.preventDefault();
      } else if (e.key === 'r' || e.key === 'R') {
        setLiveCropRect(null);
        e.preventDefault();
      } else if (e.key.startsWith('Arrow') && liveCropRect) {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        e.preventDefault();
        setLiveCropRect(
          clampRect(
            normalizeRect({ ...liveCropRect, x: liveCropRect.x + dx, y: liveCropRect.y + dy }),
            originalImageData.width,
            originalImageData.height,
          ),
        );
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cropMode, liveCropRect, originalImageData.width, originalImageData.height, crop, id]);

  function updateRectField(patch: Partial<CropRect>) {
    if (!liveCropRect) return;
    setLiveCropRect(
      clampRect(
        normalizeRect({ ...liveCropRect, ...patch }),
        originalImageData.width,
        originalImageData.height,
      ),
    );
  }

  return (
    <div class="px-6 lg:px-8 pt-2 pb-6">
      <header class="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <button
          class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          onClick={backToQueue}
        >
          ← Back to queue
        </button>
        <button
          class="px-3 py-2 text-sm text-zinc-500 hover:text-red-400 transition-colors"
          onClick={removeAndBack}
        >
          Remove from queue
        </button>
      </header>

      <div class="grid lg:grid-cols-[1fr_400px] gap-6 max-w-7xl mx-auto items-start">
        <div class="h-[70vh] min-h-[400px] relative">
          {cropMode ? (
            <CropTool
              imageUrl={originalUrl}
              sourceWidth={originalImageData.width}
              sourceHeight={originalImageData.height}
              rect={liveCropRect}
              aspectRatio={aspectRatio}
              onRectChange={setLiveCropRect}
              onViewerReady={(api) => { viewerApiRef.current = api; }}
            />
          ) : (
            <CompareSlider
              originalUrl={croppedOriginalUrl ?? originalUrl}
              encodedUrl={encodedUrl}
              encoding={isEncoding}
              onViewerReady={(api) => { viewerApiRef.current = api; }}
            />
          )}
        </div>

        <aside class="bg-zinc-900 rounded-xl p-6 space-y-6 self-start">
          <div>
            <p class="text-sm font-medium truncate" title={filename}>{filename}</p>
            <p class="text-xs text-zinc-500 mt-1">
              {effectiveImageData.width}×{effectiveImageData.height}
              {crop && (
                <span class="text-amber-400"> · cropped from {originalImageData.width}×{originalImageData.height}</span>
              )}
              {' · '}{formatBytes(originalBytes)}
            </p>
          </div>

          {cropMode ? (
            <CropControls
              rect={liveCropRect}
              hasAppliedCrop={!!crop}
              aspectId={aspectId}
              onAspectChange={setAspectId}
              customW={customW}
              customH={customH}
              onCustomChange={(w, h) => { setCustomW(w); setCustomH(h); }}
              onUpdateField={updateRectField}
              onReset={() => setLiveCropRect(null)}
              onCancel={() => setCropMode(false)}
              onApply={applyLiveCrop}
              onClear={clearAppliedCrop}
            />
          ) : (
            <button
              class="w-full px-4 py-2 text-sm rounded-lg font-medium bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors"
              onClick={enterCropMode}
            >
              {crop ? 'Edit crop' : 'Crop'}
              <span class="text-xs text-zinc-500 ml-2">C</span>
            </button>
          )}

          <CodecPicker
            value={pendingCodec}
            showingPresets={showingPresets}
            onSelectCodec={(c) => {
              setShowingPresets(false);
              setPendingCodec(c);
              // No options reset — pendingByCodec preserves per-codec edits.
            }}
            onSelectPresets={() => setShowingPresets(true)}
          />

          {showingPresets ? (
            <PresetsPanel
              onApply={(pid) => applyPresetToImage(pid, id)}
              applyLabel="Apply to this image"
              activePresetId={presetId}
              appliedPresetId={presetId}
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
                  applyLabel={`Apply ${pendingMeta.name}`}
                  onClick={() => {
                    setImageCodecAndOptions(id, pendingCodec, pendingOptions);
                    scheduleEncodeImage(id);
                  }}
                />
                <button
                  type="button"
                  onClick={resetPendingOptions}
                  disabled={isAtDefaults}
                  class="px-3 py-1.5 text-sm rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Reset this format's options to defaults"
                >
                  Reset
                </button>
              </div>
              <div class="space-y-2 pt-1 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => applyToAll(pendingCodec, pendingOptions)}
                  class="w-full text-xs text-zinc-400 hover:text-zinc-100 py-1.5 px-2 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  Apply these settings to all images
                </button>
                <button
                  type="button"
                  onClick={() => setSavePresetOpen(true)}
                  class="w-full text-xs text-zinc-400 hover:text-zinc-100 py-1.5 px-2 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  Save current settings as preset…
                </button>
                {presetId && isApplied && (
                  <p class="text-xs text-amber-300/80 text-center">
                    Settings come from a preset · changes will detach
                  </p>
                )}
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

          <dl class="text-sm space-y-1.5 pt-2 border-t border-zinc-800">
            <Row label="Original" value={formatBytes(originalBytes)} />
            <Row
              label="Encoded"
              value={encoded ? formatBytes(encoded.bytes) : '—'}
              pending={isEncoding}
            />
            <Row
              label="Change"
              value={encoded ? formatDeltaPct(originalBytes, encoded.bytes) : '—'}
              stale={isEncoding}
            />
            <Row
              label="Encode time"
              value={encoded ? `${encoded.msElapsed.toFixed(0)} ms` : '—'}
              stale={isEncoding}
            />
          </dl>

          <button
            disabled={!encoded || isEncoding}
            onClick={downloadEncoded}
            class="w-full px-4 py-3 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download {meta.name}
          </button>
        </aside>
      </div>
    </div>
  );
}

interface CropControlsProps {
  rect: CropRect | null;
  hasAppliedCrop: boolean;
  aspectId: string;
  onAspectChange: (id: string) => void;
  customW: number;
  customH: number;
  onCustomChange: (w: number, h: number) => void;
  onUpdateField: (patch: Partial<CropRect>) => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
  onClear: () => void;
}

function CropControls({
  rect,
  hasAppliedCrop,
  aspectId,
  onAspectChange,
  customW,
  customH,
  onCustomChange,
  onUpdateField,
  onReset,
  onCancel,
  onApply,
  onClear,
}: CropControlsProps) {
  const valid = rect && rect.width >= 1 && rect.height >= 1;
  return (
    <div class="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <div class="text-xs font-medium text-amber-300 uppercase tracking-wide">Crop mode</div>

      <div>
        <label class="block text-xs text-zinc-400 mb-1">Aspect ratio</label>
        <select
          value={aspectId}
          onChange={(e) => onAspectChange((e.currentTarget as HTMLSelectElement).value)}
          class="w-full bg-zinc-800 text-zinc-100 text-sm rounded px-2 py-1.5 border border-zinc-700"
        >
          {ASPECT_RATIOS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        {aspectId === 'custom' && (
          <div class="flex items-center gap-2 mt-2">
            <NudgeInput value={customW} onChange={(v) => onCustomChange(v, customH)} min={1} max={9999} />
            <span class="text-zinc-500">:</span>
            <NudgeInput value={customH} onChange={(v) => onCustomChange(customW, v)} min={1} max={9999} />
          </div>
        )}
      </div>

      <div class="grid grid-cols-2 gap-2">
        <FieldInput label="X" value={rect ? Math.round(rect.x) : 0} onChange={(v) => onUpdateField({ x: v })} disabled={!rect} />
        <FieldInput label="Y" value={rect ? Math.round(rect.y) : 0} onChange={(v) => onUpdateField({ y: v })} disabled={!rect} />
        <FieldInput label="W" value={rect ? Math.round(rect.width) : 0} onChange={(v) => onUpdateField({ width: v })} disabled={!rect} />
        <FieldInput label="H" value={rect ? Math.round(rect.height) : 0} onChange={(v) => onUpdateField({ height: v })} disabled={!rect} />
      </div>

      {!valid && (
        <p class="text-xs text-zinc-500">Click and drag on the image, or type values above.</p>
      )}

      <div class="grid grid-cols-2 gap-2 pt-1">
        <button
          class="px-3 py-2 text-sm rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          onClick={onReset}
          disabled={!rect}
          title="R"
        >
          Reset
        </button>
        <button
          class="px-3 py-2 text-sm rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          onClick={onCancel}
          title="Esc"
        >
          Cancel
        </button>
        {hasAppliedCrop && (
          <button
            class="px-3 py-2 text-sm rounded text-red-400 hover:bg-red-500/10 transition-colors col-span-2"
            onClick={onClear}
          >
            Clear applied crop
          </button>
        )}
        <button
          class="col-span-2 px-3 py-2 text-sm rounded bg-zinc-100 text-zinc-900 font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onApply}
          disabled={!valid}
          title="Enter"
        >
          Apply crop
        </button>
      </div>

      <p class="text-xs text-zinc-500 pt-1 leading-relaxed">
        Shift = preserve ratio · Alt = from center · Arrows nudge (Shift = 10 px) · Wheel = zoom · Space + drag = pan · 0 = fit · 1 = 100%
      </p>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label class={`flex items-center gap-1.5 ${disabled ? 'opacity-50' : ''}`}>
      <span class="text-xs text-zinc-500 w-3">{label}</span>
      <NudgeInput value={value} onChange={onChange} disabled={disabled} />
    </label>
  );
}

function NudgeInput({
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const direction = e.key === 'ArrowUp' ? 1 : -1;
      const step = e.shiftKey ? 10 : 1;
      e.preventDefault();
      let next = value + direction * step;
      if (min != null) next = Math.max(min, next);
      if (max != null) next = Math.min(max, next);
      onChange(next);
    }
  }

  return (
    <input
      type="number"
      value={value}
      disabled={disabled}
      onInput={(e) => {
        const v = parseInt((e.currentTarget as HTMLInputElement).value, 10);
        if (!Number.isNaN(v)) onChange(v);
      }}
      onKeyDown={handleKeyDown}
      class="flex-1 min-w-0 bg-zinc-800 text-zinc-100 text-sm tabular-nums rounded px-2 py-1 border border-zinc-700 disabled:opacity-50"
    />
  );
}

function Row({
  label,
  value,
  pending,
  stale,
}: {
  label: string;
  value: string;
  pending?: boolean;
  stale?: boolean;
}) {
  return (
    <div class="flex justify-between">
      <dt class="text-zinc-400">{label}</dt>
      <dd class={`tabular-nums flex items-center gap-1.5 ${stale ? 'opacity-40' : ''}`}>
        {pending && <Spinner size={12} />}
        <span>{pending ? 'encoding…' : value}</span>
      </dd>
    </div>
  );
}
