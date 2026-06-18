import { useState } from 'preact/hooks';
import { images, clearImages } from '../state/images';
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
  const [confirmingClear, setConfirmingClear] = useState(false);

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
    <div class="sticky bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur-sm px-6 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div class="text-xs text-muted tabular-nums flex items-center gap-3 flex-wrap">
          <span>
            <span class="text-faint">Format:</span> {meta.name}
          </span>
          <span role="status" aria-live="polite">
            <span class="text-faint">Done:</span> {doneItems.length} / {items.length}
          </span>
          {totalOut > 0 && (
            <span>
              <span class="text-faint">Total:</span> {formatBytes(totalIn)} → {formatBytes(totalOut)}
            </span>
          )}
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          {confirmingClear ? (
            <div class="flex items-center gap-2 mr-1">
              <span class="text-xs text-muted">Clear {items.length} image{items.length === 1 ? '' : 's'}?</span>
              <button
                autofocus
                onClick={() => {
                  clearImages();
                  setConfirmingClear(false);
                }}
                class="px-3 py-2 text-sm font-medium rounded bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmingClear(false)}
                class="px-3 py-2 text-sm text-faint hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              class="px-4 py-2 text-sm font-medium rounded text-muted hover:text-red-600 hover:bg-elevated transition-colors mr-1"
            >
              Clear all
            </button>
          )}
          <button
            onClick={downloadAll}
            disabled={doneItems.length === 0 || encoding || zipping}
            class="px-4 py-2 bg-elevated text-ink text-sm font-medium rounded hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download all{!allDone && doneItems.length > 0 ? ` (${doneItems.length})` : ''}
          </button>
          <button
            onClick={downloadZip}
            disabled={doneItems.length === 0 || encoding || zipping}
            class="px-4 py-2 bg-brand text-white text-sm font-medium rounded hover:bg-brand-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {zipping && <Spinner size={12} />}
            {zipping ? 'Zipping…' : 'Download zip'}
          </button>
        </div>
      </div>
    </div>
  );
}
