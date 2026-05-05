import { useEffect, useMemo, useState } from 'preact/hooks';
import { clearImage, currentImage, encoded, encoding, setCrop } from '../state/images';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { getCompressPool } from '../workers/pool';
import { CodecPicker } from './CodecPicker';
import { CodecOptionsPanel } from './CodecOptionsPanel';
import { CompareSlider } from './CompareSlider';
import { CropTool } from './CropTool';
import type { CropRect } from '../lib/crop';
import { cropImageData, normalizeRect } from '../lib/crop';
import { formatBytes, formatDeltaPct } from '../lib/format';

const DEBOUNCE_MS = 250;

export function Editor() {
  const img = currentImage.value;
  if (!img) return null;
  const { filename, originalImageData, originalBytes, originalBlob, crop } = img;

  const [codec, setCodec] = useState<CodecId>('mozjpeg');
  const [options, setOptions] = useState<Record<string, unknown>>(CODECS.mozjpeg.defaults);
  const [cropMode, setCropMode] = useState(false);
  const [liveCropRect, setLiveCropRect] = useState<CropRect | null>(null);
  const meta = CODECS[codec];

  useEffect(() => {
    setOptions(CODECS[codec].defaults);
  }, [codec]);

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

  const enc = encoded.value;
  const [encodedUrl, setEncodedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enc) {
      setEncodedUrl(null);
      return;
    }
    const url = URL.createObjectURL(enc.blob);
    setEncodedUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [enc]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      encoding.value = true;
      try {
        const pool = getCompressPool();
        const { buffer, msElapsed } = await pool.enqueue(codec, options, effectiveImageData);
        if (cancelled) return;
        const blob = new Blob([buffer], { type: CODECS[codec].outputMime });
        encoded.value = { bytes: blob.size, blob, msElapsed };
      } catch (err) {
        if (!cancelled) {
          console.error('Encode failed', err);
          encoded.value = null;
        }
      } finally {
        if (!cancelled) encoding.value = false;
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [codec, options, effectiveImageData]);

  const isEncoding = encoding.value;

  function downloadEncoded() {
    if (!enc) return;
    const url = URL.createObjectURL(enc.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = swapExt(filename, meta.outputExt);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function enterCropMode() {
    setLiveCropRect(crop ?? null);
    setCropMode(true);
  }

  function applyLiveCrop() {
    if (liveCropRect && liveCropRect.width >= 1 && liveCropRect.height >= 1) {
      setCrop(normalizeRect(liveCropRect));
    } else {
      setCrop(undefined);
    }
    setCropMode(false);
  }

  function clearAppliedCrop() {
    setCrop(undefined);
    setCropMode(false);
  }

  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100 p-6 lg:p-8">
      <header class="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold tracking-tight">Ziip</h1>
        <button
          class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          onClick={clearImage}
        >
          ← Drop another image
        </button>
      </header>

      <div class="grid lg:grid-cols-[1fr_360px] gap-6 max-w-7xl mx-auto">
        {cropMode ? (
          <CropTool
            imageUrl={originalUrl}
            sourceWidth={originalImageData.width}
            sourceHeight={originalImageData.height}
            rect={liveCropRect}
            onRectChange={setLiveCropRect}
          />
        ) : (
          <CompareSlider
            originalUrl={croppedOriginalUrl ?? originalUrl}
            encodedUrl={encodedUrl}
            alt={filename}
          />
        )}

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
            </button>
          )}

          <CodecPicker value={codec} onChange={setCodec} />

          <CodecOptionsPanel meta={meta} values={options} onChange={setOptions} />

          <dl class="text-sm space-y-1.5 pt-2 border-t border-zinc-800">
            <Row label="Original" value={formatBytes(originalBytes)} />
            <Row label="Encoded" value={isEncoding ? '…' : enc ? formatBytes(enc.bytes) : '—'} />
            <Row label="Change" value={enc ? formatDeltaPct(originalBytes, enc.bytes) : '—'} />
            <Row label="Encode time" value={enc ? `${enc.msElapsed.toFixed(0)} ms` : '—'} />
          </dl>

          <button
            disabled={!enc || isEncoding}
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
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
  onClear: () => void;
}

function CropControls({ rect, hasAppliedCrop, onReset, onCancel, onApply, onClear }: CropControlsProps) {
  const valid = rect && rect.width >= 1 && rect.height >= 1;
  return (
    <div class="space-y-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <div class="text-xs font-medium text-amber-300 uppercase tracking-wide">Crop mode</div>
      <div class="text-sm tabular-nums text-zinc-200 min-h-[2.5rem]">
        {valid ? (
          <>
            <div>
              <span class="text-zinc-500">Position:</span> {Math.round(rect.x)}, {Math.round(rect.y)}
            </div>
            <div>
              <span class="text-zinc-500">Size:</span> {Math.round(rect.width)}×{Math.round(rect.height)} px
            </div>
          </>
        ) : (
          <p class="text-zinc-500 text-xs">Click and drag on the image to define a region.</p>
        )}
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="px-3 py-2 text-sm rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          onClick={onReset}
          disabled={!rect}
        >
          Reset
        </button>
        <button
          class="px-3 py-2 text-sm rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          onClick={onCancel}
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
        >
          Apply crop
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div class="flex justify-between">
      <dt class="text-zinc-400">{label}</dt>
      <dd class="tabular-nums">{value}</dd>
    </div>
  );
}

function swapExt(filename: string, newExt: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? `${filename}.${newExt}` : `${filename.slice(0, dot)}.${newExt}`;
}
