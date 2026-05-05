import { CODECS } from '../codecs/registry';
import type { ImageItem } from '../state/images';

export function encodedFilename(item: ImageItem): string {
  if (!item.encoded) return item.filename;
  const ext = CODECS[item.encoded.codec].outputExt;
  const dot = item.filename.lastIndexOf('.');
  const base = dot === -1 ? item.filename : item.filename.slice(0, dot);
  return `${base}.${ext}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadEncodedSequential(items: ImageItem[]): Promise<void> {
  for (const item of items) {
    if (item.status !== 'done' || !item.encoded) continue;
    triggerBlobDownload(item.encoded.blob, encodedFilename(item));
    // A small gap so the browser handles each download cleanly. Some
    // browsers throttle or merge rapid sequential downloads otherwise.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}
