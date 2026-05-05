import { useEffect, useState } from 'preact/hooks';
import { clearImage, currentImage, encoded, encoding } from '../state/images';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { getCompressPool } from '../workers/pool';
import { CodecPicker } from './CodecPicker';
import { CodecOptionsPanel } from './CodecOptionsPanel';
import { CompareSlider } from './CompareSlider';
import { formatBytes, formatDeltaPct } from '../lib/format';

const DEBOUNCE_MS = 250;

export function Editor() {
  const img = currentImage.value;
  if (!img) return null;
  const { filename, originalImageData, originalBytes, originalBlob } = img;

  const [codec, setCodec] = useState<CodecId>('mozjpeg');
  const [options, setOptions] = useState<Record<string, unknown>>(CODECS.mozjpeg.defaults);
  const meta = CODECS[codec];

  useEffect(() => {
    setOptions(CODECS[codec].defaults);
  }, [codec]);

  const [originalUrl] = useState(() => URL.createObjectURL(originalBlob));
  useEffect(() => () => URL.revokeObjectURL(originalUrl), [originalUrl]);

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
        const { buffer, msElapsed } = await pool.enqueue(codec, options, originalImageData);
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
  }, [codec, options, originalImageData]);

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
        <CompareSlider originalUrl={originalUrl} encodedUrl={encodedUrl} alt={filename} />

        <aside class="bg-zinc-900 rounded-xl p-6 space-y-6 self-start">
          <div>
            <p class="text-sm font-medium truncate" title={filename}>{filename}</p>
            <p class="text-xs text-zinc-500 mt-1">
              {originalImageData.width}×{originalImageData.height} · {formatBytes(originalBytes)}
            </p>
          </div>

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
