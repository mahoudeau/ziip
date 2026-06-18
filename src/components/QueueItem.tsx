import type { ImageItem } from '../state/images';
import { removeImage, selectImage } from '../state/images';
import { formatBytes, formatDeltaPct } from '../lib/format';
import { encodedFilename, triggerBlobDownload } from '../lib/download';
import { useRenderableSourceUrl } from '../lib/preview';
import { CODECS } from '../codecs/registry';
import { Spinner } from './ui/Spinner';

interface Props {
  item: ImageItem;
}

const STATUS_STYLES: Record<ImageItem['status'], string> = {
  queued: 'bg-elevated text-muted',
  encoding: 'bg-amber-500/20 text-amber-600',
  done: 'bg-emerald-500/20 text-emerald-700',
  error: 'bg-red-500/20 text-red-600',
};

export function QueueItem({ item }: Props) {
  const previewUrl = useRenderableSourceUrl(item.originalBlob, item.filename, item.originalImageData);

  function onDownload(e: MouseEvent) {
    e.stopPropagation();
    if (!item.encoded) return;
    triggerBlobDownload(item.encoded.blob, encodedFilename(item));
  }

  function onRemove(e: MouseEvent) {
    e.stopPropagation();
    removeImage(item.id);
  }

  const delta = item.encoded
    ? formatDeltaPct(item.originalBytes, item.encoded.bytes)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Edit ${item.filename}`}
      class="bg-surface rounded-xl overflow-hidden hover:ring-2 hover:ring-brand focus-visible:ring-2 focus-visible:ring-brand transition-all flex flex-col cursor-pointer"
      onClick={() => selectImage(item.id)}
      onKeyDown={(e) => {
        // Only when focus is on the card itself, so Enter on the inner
        // Download/Remove buttons doesn't also open the editor.
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          selectImage(item.id);
        }
      }}
    >
      <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
        <div class="flex items-center gap-1.5 min-w-0">
          <span
            class={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded flex items-center gap-1 ${STATUS_STYLES[item.status]}`}
          >
            {item.status === 'encoding' && <Spinner size={10} />}
            {item.status}
          </span>
          <span class="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-elevated text-ink">
            {CODECS[item.codec].outputExt}
          </span>
        </div>
        {item.crop && (
          <span class="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-amber-500/20 text-amber-600">
            cropped
          </span>
        )}
      </div>
      <div class="relative aspect-square bg-bg overflow-hidden">
        {previewUrl && (
          <img
            src={previewUrl}
            alt=""
            class="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        )}
      </div>
      <div class="p-3 space-y-1.5">
        <p class="text-sm font-medium truncate" title={item.filename}>{item.filename}</p>
        <div class="flex justify-between text-xs text-faint tabular-nums">
          <span>{formatBytes(item.originalBytes)}</span>
          <span class="text-muted">
            {item.encoded ? formatBytes(item.encoded.bytes) : '—'}
          </span>
        </div>
        {delta && <p class="text-xs text-muted tabular-nums">{delta}</p>}
        {item.status === 'error' && item.error && (
          <p class="text-xs text-red-600 line-clamp-2">{item.error}</p>
        )}
      </div>
      <div class="flex border-t border-border">
        <button
          type="button"
          onClick={onDownload}
          disabled={!item.encoded}
          class="flex-1 px-3 py-2 text-xs text-muted hover:text-ink hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Download
        </button>
        <button
          type="button"
          onClick={onRemove}
          class="px-3 py-2 text-xs text-faint hover:text-red-600 hover:bg-red-500/10 transition-colors border-l border-border"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
