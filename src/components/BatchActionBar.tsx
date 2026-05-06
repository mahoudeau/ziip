import { useState } from 'preact/hooks';
import { images } from '../state/images';
import { downloadEncodedSequential, downloadEncodedZip } from '../lib/download';
import { CODECS } from '../codecs/registry';
import { codec } from '../state/settings';
import { formatBytes } from '../lib/format';
import { Spinner } from './ui/Spinner';

export function BatchActionBar() {
  const items = images.value;
  const meta = CODECS[codec.value];
  const doneItems = items.filter((i) => i.status === 'done' && i.encoded);
  const encoding = items.some((i) => i.status === 'encoding' || i.status === 'queued');
  const [zipping, setZipping] = useState(false);

  const totalIn = items.reduce((sum, i) => sum + i.originalBytes, 0);
  const totalOut = doneItems.reduce((sum, i) => sum + (i.encoded?.bytes ?? 0), 0);
  const allDone = items.length > 0 && doneItems.length === items.length;

  function downloadAll() {
    void downloadEncodedSequential(items);
  }

  async function downloadZip() {
    setZipping(true);
    try {
      await downloadEncodedZip(items);
    } catch (err) {
      console.error('Zip download failed', err);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div class="border-t border-zinc-800 bg-zinc-950 px-6 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div class="text-xs text-zinc-400 tabular-nums flex items-center gap-3 flex-wrap">
          <span>
            <span class="text-zinc-500">Format:</span> {meta.name}
          </span>
          <span>
            <span class="text-zinc-500">Done:</span> {doneItems.length} / {items.length}
          </span>
          {totalOut > 0 && (
            <span>
              <span class="text-zinc-500">Total:</span> {formatBytes(totalIn)} → {formatBytes(totalOut)}
            </span>
          )}
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={downloadAll}
            disabled={doneItems.length === 0 || encoding || zipping}
            class="px-4 py-2 bg-zinc-800 text-zinc-100 text-sm font-medium rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download all{!allDone && doneItems.length > 0 ? ` (${doneItems.length})` : ''}
          </button>
          <button
            onClick={downloadZip}
            disabled={doneItems.length === 0 || encoding || zipping}
            class="px-4 py-2 bg-zinc-100 text-zinc-900 text-sm font-medium rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {zipping && <Spinner size={12} />}
            {zipping ? 'Zipping…' : 'Download zip'}
          </button>
        </div>
      </div>
    </div>
  );
}
