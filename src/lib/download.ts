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

/**
 * Bundle every encoded item into a single zip and download it. JSZip is
 * lazy-imported so the ~100 KB module only loads when the user actually
 * clicks the zip button.
 */
export async function downloadEncodedZip(items: ImageItem[]): Promise<void> {
  const ready = items.filter((i) => i.status === 'done' && i.encoded);
  if (ready.length === 0) return;
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  // Detect duplicate filenames so we can suffix them ("foo.jpg", "foo (2).jpg").
  const counts = new Map<string, number>();
  for (const item of ready) {
    const base = encodedFilename(item);
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    const name = n === 1 ? base : suffixName(base, n);
    zip.file(name, item.encoded!.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  triggerBlobDownload(blob, `ziip-${stamp}.zip`);
}

function suffixName(filename: string, n: number): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return `${filename} (${n})`;
  return `${filename.slice(0, dot)} (${n})${filename.slice(dot)}`;
}
