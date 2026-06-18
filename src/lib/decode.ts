import DecodeWorker from '../workers/decode.worker?worker';

type DecodeSource =
  | { kind: 'file'; file: File }
  | { kind: 'jxl'; bytes: ArrayBuffer };

interface DecodeJob {
  id: number;
  source: DecodeSource;
}

type DecodeResult =
  | { id: number; ok: true; bytes: ArrayBuffer; width: number; height: number }
  | { id: number; ok: false; error: string };

interface PendingJob {
  job: DecodeJob;
  transfer: Transferable[];
  resolve: (data: ImageData) => void;
  reject: (err: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
}

const POOL_SIZE = Math.min(4, Math.max(2, (navigator.hardwareConcurrency ?? 2) - 1));

const slots: WorkerSlot[] = [];
const queue: PendingJob[] = [];
const inflight = new Map<number, PendingJob>();
let nextJobId = 1;

function ensurePool(): void {
  if (slots.length > 0) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const worker = new DecodeWorker();
    worker.onmessage = (e: MessageEvent<DecodeResult>) => handleResult(worker, e.data);
    slots.push({ worker, busy: false });
  }
}

function handleResult(worker: Worker, result: DecodeResult): void {
  const slot = slots.find((s) => s.worker === worker);
  if (slot) slot.busy = false;
  const pending = inflight.get(result.id);
  if (!pending) return;
  inflight.delete(result.id);
  if (result.ok) {
    pending.resolve(
      new ImageData(new Uint8ClampedArray(result.bytes), result.width, result.height),
    );
  } else {
    pending.reject(new Error(result.error));
  }
  dispatch();
}

function dispatch(): void {
  while (queue.length > 0) {
    const slot = slots.find((s) => !s.busy);
    if (!slot) return;
    const pending = queue.shift()!;
    slot.busy = true;
    inflight.set(pending.job.id, pending);
    slot.worker.postMessage(pending.job, pending.transfer);
  }
}

function enqueueJob(source: DecodeSource, transfer: Transferable[]): Promise<ImageData> {
  ensurePool();
  return new Promise((resolve, reject) => {
    const id = nextJobId++;
    const job: DecodeJob = { id, source };
    queue.push({ job, transfer, resolve, reject });
    dispatch();
  });
}

/** Extensions we accept beyond what `image/*` MIME sniffing reliably covers.
 * HEIC/HEIF often arrive with an empty or non-standard MIME type. */
const EXTRA_EXT = /\.(heic|heif|svg)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;
const SVG_EXT = /\.svg$/i;
/** When an SVG has no intrinsic px size, rasterize its viewBox so the longest
 * side is this many pixels. The user can then rescale via the resize tool. */
const SVG_MAX_DIM = 2048;

/** Permissive accept check for drop/file-picker input. */
export function isLikelyImageFile(file: File): boolean {
  return file.type.startsWith('image/') || EXTRA_EXT.test(file.name);
}

function isHeic(type: string, name: string): boolean {
  const t = type.toLowerCase();
  return t === 'image/heic' || t === 'image/heif' || HEIC_EXT.test(name);
}

/** Whether a preview can use the raw source blob directly. True for ordinary
 * raster formats (the blob renders and matches the decoded geometry). False
 * for HEIC/HEIF (can't render outside Safari) and SVG (renders, but its
 * geometry differs from the rasterized pixels we actually encode) — those
 * preview from the decoded ImageData instead so the compare view lines up. */
export function canPreviewFromSourceBlob(type: string, name: string): boolean {
  return !isHeic(type, name) && !isSvg(type, name);
}

function isSvg(type: string, name: string): boolean {
  return type.toLowerCase() === 'image/svg+xml' || SVG_EXT.test(name);
}

export function decodeImageFile(file: File): Promise<ImageData> {
  // HEIC/HEIF: browsers other than Safari can't decode these natively, so we
  // run libheif (via heic-to) on the main thread. heic-to embeds its own wasm
  // and internal worker, so it stays self-contained off our decode pool.
  if (isHeic(file.type, file.name)) return decodeHeicFile(file);
  // SVG: rasterize on the main thread. createImageBitmap on an SVG blob isn't
  // reliable cross-browser and the decode worker has no DOM fallback.
  if (isSvg(file.type, file.name)) return rasterizeSvgFile(file);
  return enqueueJob({ kind: 'file', file }, []);
}

/** Rasterize an SVG to RGBA pixels at a sensible size (intrinsic px size if
 * the SVG declares one, else its viewBox scaled to SVG_MAX_DIM). */
async function rasterizeSvgFile(file: File): Promise<ImageData> {
  const { width, height, markup } = prepareSvg(await file.text());
  // Re-serialize with explicit px width/height so the browser rasterizes the
  // vector at full resolution instead of a blurry default bitmap.
  const blob = new Blob([markup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context to rasterize SVG');
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Length attribute → px number. Unitless and `px` accepted; `%`/other units
 * are treated as "no intrinsic size" so we fall back to the viewBox. */
function parseLen(v: string | null): number {
  if (!v) return NaN;
  const s = v.trim();
  if (s.endsWith('%')) return NaN;
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

function prepareSvg(text: string): { width: number; height: number; markup: string } {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error('Not a valid SVG file');
  }

  let w = parseLen(svg.getAttribute('width'));
  let h = parseLen(svg.getAttribute('height'));

  if (!(w > 0) || !(h > 0)) {
    // No usable intrinsic size — derive from viewBox aspect, scaled to fit.
    const parts = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/);
    const vbW = Number(parts[2]) > 0 ? Number(parts[2]) : 1;
    const vbH = Number(parts[3]) > 0 ? Number(parts[3]) : 1;
    const scale = SVG_MAX_DIM / Math.max(vbW, vbH);
    w = vbW * scale;
    h = vbH * scale;
  }

  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  const markup = new XMLSerializer().serializeToString(svg);
  return { width, height, markup };
}

async function decodeHeicFile(file: File): Promise<ImageData> {
  const { heicTo } = await import('heic-to');
  const bitmap = await heicTo({ blob: file, type: 'bitmap' });
  return bitmapToImageData(bitmap);
}

/** Draw an ImageBitmap to an OffscreenCanvas and read back RGBA ImageData.
 * Used by the main-thread decode paths (HEIC, and SVG in lib later). */
export function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Could not get 2D context to read decoded image');
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Decode JXL bytes (anywhere the browser can't do it natively — Chrome,
 * Firefox). Caller transfers ownership of `bytes`. */
export function decodeJxlBytes(bytes: ArrayBuffer): Promise<ImageData> {
  return enqueueJob({ kind: 'jxl', bytes }, [bytes]);
}
