import { CODECS } from '../codecs/registry';
import { cropImageData } from '../lib/crop';
import { getCompressPool } from '../workers/pool';
import { images, selectedImageId, updateImage } from './images';

const DEBOUNCE_MS = 250;

const timersByImage = new Map<string, number>();
const generationByImage = new Map<string, number>();

/**
 * Schedule a (re-)encode for the given image. Coalesces rapid successive
 * calls via per-image debouncing. Per-image generation tracking ensures
 * stale results from superseded jobs are dropped.
 */
export function scheduleEncodeImage(id: string): void {
  const existing = timersByImage.get(id);
  if (existing !== undefined) window.clearTimeout(existing);
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

  const gen = (generationByImage.get(id) ?? 0) + 1;
  generationByImage.set(id, gen);

  // Each image carries its own codec + options now.
  const codecId = img.codec;
  const opts = img.options;

  updateImage(id, { status: 'encoding' });

  try {
    const data = img.crop ? cropImageData(img.originalImageData, img.crop) : img.originalImageData;
    const priority = id === selectedImageId.peek() ? 'high' : 'normal';
    const { buffer, msElapsed } = await getCompressPool().enqueue(codecId, opts, data, priority);
    if (generationByImage.get(id) !== gen) return;
    const blob = new Blob([buffer], { type: CODECS[codecId].outputMime });
    updateImage(id, {
      status: 'done',
      encoded: { bytes: blob.size, blob, codec: codecId, msElapsed },
      error: undefined,
    });
    if (img.presetId) {
      // Lazy require to avoid an import cycle: presets.ts imports from
      // encode.ts, so we can't import presets at the top.
      const { recordPresetUse } = await import('./presets');
      recordPresetUse(img.presetId, img.originalBytes, blob.size);
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
    const friendly = /aborted\(\)?/i.test(raw)
      ? `${CODECS[codecId].name} couldn't encode this image at ${dims}. Try lowering the effort/quality, picking another codec, or a smaller image.`
      : raw;
    updateImage(id, {
      status: 'error',
      encoded: undefined,
      error: friendly,
    });
  }
}
