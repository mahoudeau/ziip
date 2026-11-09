import { CODECS } from '../codecs/registry';
import type { ImageItem } from '../state/images';

export function encodedFilename(item: ImageItem): string {
  if (!item.encoded) return item.filename;
  const ext = CODECS[item.encoded.codec].outputExt;
  const dot = item.filename.lastIndexOf('.');
  const base = dot === -1 ? item.filename : item.filename.slice(0, dot);
  return `${base}.${ext}`;
}

/** How long a download's object URL stays alive. The browser reads the blob
 * after the click returns, and later still if it asks the user first, so
 * revoking in the same tick can kill the download. */
const REVOKE_DELAY_MS = 60_000;
/** Gap between the anchor clicks of the fallback multi-file download. */
const SEQUENTIAL_GAP_MS = 400;

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

interface DirectoryPickerWindow {
  showDirectoryPicker?: (options: {
    id?: string;
    mode: 'readwrite';
    startIn?: 'pictures';
  }) => Promise<FileSystemDirectoryHandle>;
}

function hasErrorName(err: unknown, name: string): boolean {
  return err instanceof DOMException && err.name === name;
}

/** Create `filename` in `dir`, suffixing it rather than overwriting whatever
 * is already there. Also covers duplicates within the batch, since each file
 * exists by the time the next one is named. */
async function createUniqueFile(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<FileSystemFileHandle> {
  for (let n = 1; ; n++) {
    const name = n === 1 ? filename : suffixName(filename, n);
    try {
      await dir.getFileHandle(name);
    } catch (err) {
      if (hasErrorName(err, 'NotFoundError')) return dir.getFileHandle(name, { create: true });
      throw err;
    }
  }
}

/** All or nothing: if any write fails, remove what this run created, so there's
 * no 0-byte file left behind and a retry doesn't save duplicates beside it. */
async function saveToDirectory(dir: FileSystemDirectoryHandle, items: ImageItem[]): Promise<void> {
  const created: string[] = [];
  try {
    for (const item of items) {
      const handle = await createUniqueFile(dir, encodedFilename(item));
      created.push(handle.name);
      const writable = await handle.createWritable();
      try {
        await writable.write(item.encoded!.blob);
        await writable.close();
      } catch (err) {
        await writable.abort().catch(() => undefined);
        throw err;
      }
    }
  } catch (err) {
    await Promise.allSettled(created.map((name) => dir.removeEntry(name)));
    throw err;
  }
}

/**
 * Save every encoded item as a separate file. Browsers only grant one download
 * per click: from the second anchor click on, Chromium holds downloads behind a
 * "download multiple files" permission, and until that's answered every later
 * download on the page waits too. So where the File System Access API exists,
 * ask for a folder once and write the files directly.
 */
export async function downloadEncodedAll(items: ImageItem[]): Promise<void> {
  const ready = items.filter((i) => i.status === 'done' && i.encoded);
  const { showDirectoryPicker } = window as unknown as DirectoryPickerWindow;
  if (ready.length > 1 && showDirectoryPicker) {
    let dir: FileSystemDirectoryHandle | undefined;
    try {
      dir = await showDirectoryPicker.call(window, {
        id: 'ziip-download-all',
        mode: 'readwrite',
        // Not 'downloads': Chromium refuses that folder's root for this API.
        startIn: 'pictures',
      });
    } catch (err) {
      if (hasErrorName(err, 'AbortError')) return; // the user closed the picker
      console.warn('Folder picker unavailable, falling back to anchor downloads', err);
    }
    if (dir) return saveToDirectory(dir, ready);
  }
  for (const [i, item] of ready.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, SEQUENTIAL_GAP_MS));
    triggerBlobDownload(item.encoded!.blob, encodedFilename(item));
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
