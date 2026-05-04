import { useEffect, useState } from 'preact/hooks';
import { clearImage, currentImage, encoded, encoding } from '../state/images';
import { encodeMozJpeg } from '../codecs/mozjpeg';
import { formatBytes, formatDeltaPct } from '../lib/format';

const DEFAULT_QUALITY = 75;
const DEBOUNCE_MS = 250;

export function Editor() {
  const img = currentImage.value;
  if (!img) return null;
  const { filename, originalImageData, originalBytes, originalBlob } = img;

  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [previewUrl] = useState(() => URL.createObjectURL(originalBlob));

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      encoding.value = true;
      const start = performance.now();
      try {
        const buffer = await encodeMozJpeg(originalImageData, quality);
        if (cancelled) return;
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        encoded.value = { bytes: blob.size, blob, msElapsed: performance.now() - start };
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
  }, [quality, originalImageData]);

  const enc = encoded.value;
  const isEncoding = encoding.value;

  function downloadEncoded() {
    if (!enc) return;
    const url = URL.createObjectURL(enc.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = swapExt(filename, 'jpg');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100 p-6 lg:p-8">
      <header class="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold tracking-tight">Ziip</h1>
        <button
          class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          onClick={clearImage}
        >
          ← Drop another image
        </button>
      </header>

      <div class="grid lg:grid-cols-[1fr_320px] gap-6 max-w-6xl mx-auto">
        <div class="bg-zinc-900 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
          <img
            src={previewUrl}
            alt={filename}
            class="max-w-full max-h-[70vh] rounded"
          />
        </div>

        <aside class="bg-zinc-900 rounded-xl p-6 space-y-6 self-start">
          <div>
            <p class="text-sm font-medium truncate" title={filename}>{filename}</p>
            <p class="text-xs text-zinc-500 mt-1">
              {originalImageData.width}×{originalImageData.height} · {formatBytes(originalBytes)}
            </p>
          </div>

          <div>
            <div class="flex justify-between items-baseline mb-2">
              <label class="text-sm font-medium">Quality (MozJPEG)</label>
              <span class="text-sm tabular-nums text-zinc-300">{quality}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={quality}
              onInput={(e) => setQuality(parseInt((e.currentTarget as HTMLInputElement).value, 10))}
              class="w-full accent-zinc-100"
            />
          </div>

          <dl class="text-sm space-y-1.5">
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
            Download JPEG
          </button>
        </aside>
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
