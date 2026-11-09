import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { cropImageData } from '../lib/crop';
import { resizeImageData } from '../lib/resize';
import { getCompressPool } from '../workers/pool';
import { images, selectedImageId, updateImage } from './images';
import { recordCompression, undoCompression } from './stats';

const DEBOUNCE_MS = 250;

const timersByImage = new Map<string, number>();
const generationByImage = new Map<string, number>();

interface RecordedEncode {
  codec: CodecId;
  bytesIn: number;
  bytesOut: number;
  presetId?: string;
}
/** What each image last added to the stats, so a re-encode replaces it. */
const recordedByImage = new Map<string, RecordedEncode>();
const controllerByImage = new Map<string, AbortController>();

// When an image leaves the queue, stop its work and forget its bookkeeping.
images.subscribe((list) => {
  const live = new Set(list.map((img) => img.id));
  for (const [id, controller] of controllerByImage) {
    if (live.has(id)) continue;
    controller.abort();
    controllerByImage.delete(id);
  }
  for (const [id, handle] of timersByImage) {
    if (live.has(id)) continue;
    window.clearTimeout(handle);
    timersByImage.delete(id);
  }
  for (const id of generationByImage.keys()) {
    if (!live.has(id)) generationByImage.delete(id);
  }
  for (const id of recordedByImage.keys()) {
    if (!live.has(id)) recordedByImage.delete(id);
  }
});

/**
 * Schedule a (re-)encode for the given image. Coalesces rapid successive
 * calls via per-image debouncing. Per-image generation tracking ensures
 * stale results from superseded jobs are dropped.
 */
export function scheduleEncodeImage(id: string): void {
  const existing = timersByImage.get(id);
  if (existing !== undefined) window.clearTimeout(existing);
  // Bump now, not when the timer fires: a job finishing inside the debounce
  // window is already out of date and must not mark the image done.
  generationByImage.set(id, (generationByImage.get(id) ?? 0) + 1);
  const handle = window.setTimeout(() => {
    timersByImage.delete(id);
    void runEncodeImage(id);
  }, DEBOUNCE_MS);
  timersByImage.set(id, handle);
}

/** Schedule re-encode for every image. Uses `peek()` so callers from
 * within reactive contexts don't accidentally subscribe to the images
 * signal. */
export function scheduleEncodeAll(): void {
  for (const img of images.peek()) {
    scheduleEncodeImage(img.id);
  }
}

async function runEncodeImage(id: string): Promise<void> {
  const img = images.peek().find((i) => i.id === id);
  if (!img) return;

  const gen = generationByImage.get(id) ?? 0;

  controllerByImage.get(id)?.abort();
  const controller = new AbortController();
  controllerByImage.set(id, controller);

  // Each image carries its own codec + options now.
  const codecId = img.codec;
  const opts = img.options;

  updateImage(id, { status: 'encoding' });

  try {
    let data = img.crop ? cropImageData(img.originalImageData, img.crop) : img.originalImageData;
    if (img.resize && (img.resize.width !== data.width || img.resize.height !== data.height)) {
      data = await resizeImageData(data, img.resize.width, img.resize.height);
      if (generationByImage.get(id) !== gen) return;
    }
    const priority = id === selectedImageId.peek() ? 'high' : 'normal';
    const { buffer, msElapsed } = await getCompressPool().enqueue(
      codecId,
      opts,
      data,
      priority,
      controller.signal,
    );
    if (generationByImage.get(id) !== gen) return;
    if (!images.peek().some((i) => i.id === id)) return; // removed while encoding
    const blob = new Blob([buffer], { type: CODECS[codecId].outputMime });
    updateImage(id, {
      status: 'done',
      encoded: { bytes: blob.size, blob, codec: codecId, msElapsed },
      error: undefined,
    });
    const previous = recordedByImage.get(id);
    if (previous) undoCompression(previous.codec, previous.bytesIn, previous.bytesOut);
    recordCompression(codecId, img.originalBytes, blob.size);
    recordedByImage.set(id, {
      codec: codecId,
      bytesIn: img.originalBytes,
      bytesOut: blob.size,
      presetId: img.presetId,
    });
    if (img.presetId || previous?.presetId) {
      // Lazy require to avoid an import cycle: presets.ts imports from
      // encode.ts, so we can't import presets at the top.
      const { recordPresetUse, undoPresetUse } = await import('./presets');
      if (previous?.presetId) undoPresetUse(previous.presetId, previous.bytesIn, previous.bytesOut);
      if (img.presetId) recordPresetUse(img.presetId, img.originalBytes, blob.size);
    }
  } catch (err) {
    if (generationByImage.get(id) !== gen) return;
    console.error(`[encode ${codecId}] ${img.filename} ${img.originalImageData.width}×${img.originalImageData.height}`, err);
    const raw = err instanceof Error ? err.message : String(err);
    // Emscripten's "Aborted()" is a generic Wasm-hit-an-abort signal that's
    // typically caused by image dimensions exceeding the encoder's limits,
    // memory exhaustion, or an invalid option combination. Surface
    // something more actionable in the UI.
    const dims = `${img.originalImageData.width}×${img.originalImageData.height}`;
    // Codecs are downloaded on first use, so one that was never used can't
    // load offline. The raw error here is an unhelpful fetch failure.
    const friendly = /aborted\(\)?/i.test(raw)
      ? `${CODECS[codecId].name} couldn't encode this image at ${dims}. Try lowering the effort/quality, picking another codec, or a smaller image.`
      : !navigator.onLine
        ? `${CODECS[codecId].name} hasn't been downloaded yet. Use it once while online to have it offline.`
        : raw;
    updateImage(id, {
      status: 'error',
      encoded: undefined,
      error: friendly,
    });
  } finally {
    if (controllerByImage.get(id) === controller) controllerByImage.delete(id);
  }
}
