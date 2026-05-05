import { useEffect, useState } from 'preact/hooks';
import type { ImageItem } from '../state/images';
import { removeImage, selectImage } from '../state/images';
import { formatBytes, formatDeltaPct } from '../lib/format';
import { encodedFilename, triggerBlobDownload } from '../lib/download';
import { Spinner } from './ui/Spinner';

interface Props {
  item: ImageItem;
}

const STATUS_STYLES: Record<ImageItem['status'], string> = {
  queued: 'bg-zinc-700 text-zinc-300',
  encoding: 'bg-amber-500/20 text-amber-300',
  done: 'bg-emerald-500/20 text-emerald-300',
  error: 'bg-red-500/20 text-red-300',
};

export function QueueItem({ item }: Props) {
  const [previewUrl] = useState(() => URL.createObjectURL(item.originalBlob));
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

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
      class="bg-zinc-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-zinc-600 transition-all flex flex-col cursor-pointer"
      onClick={() => selectImage(item.id)}
    >
      <div class="relative aspect-square bg-zinc-950">
        <img
          src={previewUrl}
          alt=""
          class="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
        <div
          class={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded flex items-center gap-1 ${STATUS_STYLES[item.status]}`}
        >
          {item.status === 'encoding' && <Spinner size={10} />}
          {item.status}
        </div>
        {item.crop && (
          <div class="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded bg-amber-500/20 text-amber-300">
            cropped
          </div>
        )}
      </div>
      <div class="p-3 space-y-1.5">
        <p class="text-sm font-medium truncate" title={item.filename}>{item.filename}</p>
        <div class="flex justify-between text-xs text-zinc-500 tabular-nums">
          <span>{formatBytes(item.originalBytes)}</span>
          <span class="text-zinc-300">
            {item.encoded ? formatBytes(item.encoded.bytes) : '—'}
          </span>
        </div>
        {delta && <p class="text-xs text-zinc-400 tabular-nums">{delta}</p>}
        {item.status === 'error' && item.error && (
          <p class="text-xs text-red-400 line-clamp-2">{item.error}</p>
        )}
      </div>
      <div class="flex border-t border-zinc-800">
        <button
          type="button"
          onClick={onDownload}
          disabled={!item.encoded}
          class="flex-1 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Download
        </button>
        <button
          type="button"
          onClick={onRemove}
          class="px-3 py-2 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border-l border-zinc-800"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
