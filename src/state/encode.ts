import { effect } from '@preact/signals';
import { CODECS } from '../codecs/registry';
import { cropImageData } from '../lib/crop';
import { getCompressPool } from '../workers/pool';
import { codec, options } from './settings';
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

/** Schedule re-encode for every image — used when global settings change.
 * Uses `peek()` so that the global codec/options effect that calls this
 * doesn't accidentally subscribe to the images signal and re-fire on every
 * status change (which would create an encode loop). */
export function scheduleEncodeAll(): void {
  for (const img of images.peek()) {
    scheduleEncodeImage(img.id);
  }
}

// Global wiring: when codec or options change, every queued image re-encodes.
// The first invocation on module load is a no-op when the queue is empty.
effect(() => {
  // Read both signals so the effect subscribes to them.
  codec.value;
  options.value;
  scheduleEncodeAll();
});

async function runEncodeImage(id: string): Promise<void> {
  const img = images.value.find((i) => i.id === id);
  if (!img) return;

  const gen = (generationByImage.get(id) ?? 0) + 1;
  generationByImage.set(id, gen);

  const codecId = codec.value;
  const opts = options.value;

  updateImage(id, { status: 'encoding' });

  try {
    const data = img.crop ? cropImageData(img.originalImageData, img.crop) : img.originalImageData;
    // The currently-selected image is what the user is actively previewing
    // in the editor — its re-encodes preempt batch jobs.
    const priority = id === selectedImageId.peek() ? 'high' : 'normal';
    const { buffer, msElapsed } = await getCompressPool().enqueue(codecId, opts, data, priority);
    if (generationByImage.get(id) !== gen) return;
    const blob = new Blob([buffer], { type: CODECS[codecId].outputMime });
    updateImage(id, {
      status: 'done',
      encoded: { bytes: blob.size, blob, codec: codecId, msElapsed },
      error: undefined,
    });
  } catch (err) {
    if (generationByImage.get(id) !== gen) return;
    updateImage(id, {
      status: 'error',
      encoded: undefined,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
