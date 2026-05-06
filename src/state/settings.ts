import { signal } from '@preact/signals';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';
import { images, updateImage } from './images';
import { scheduleEncodeAll } from './encode';

// "Default" settings: applied to every NEW image as it's added to the queue,
// and reflected in the queue sidebar. The Editor mutates only the selected
// image's settings — that doesn't touch these defaults.
export const codec = signal<CodecId>('mozjpeg');
export const options = signal<Record<string, unknown>>({ ...CODECS.mozjpeg.defaults });

/** Queue-sidebar codec change: updates the default AND every image. */
export function setCodec(next: CodecId): void {
  if (codec.peek() === next) return;
  const newOpts = { ...CODECS[next].defaults };
  codec.value = next;
  options.value = newOpts;
  for (const img of images.peek()) {
    updateImage(img.id, { codec: next, options: { ...newOpts } });
  }
  scheduleEncodeAll();
}

/** Queue-sidebar options change: updates the default AND every image. */
export function setOptions(next: Record<string, unknown>): void {
  options.value = next;
  const c = codec.peek();
  for (const img of images.peek()) {
    updateImage(img.id, { codec: c, options: { ...next } });
  }
  scheduleEncodeAll();
}

/** "Apply to all" — pushes the given codec+options pair to every image and
 * also updates the default for new images. Different from setCodec because
 * it carries explicit options (not the new codec's defaults). */
export function applyToAll(c: CodecId, o: Record<string, unknown>): void {
  codec.value = c;
  options.value = { ...o };
  for (const img of images.peek()) {
    updateImage(img.id, { codec: c, options: { ...o } });
  }
  scheduleEncodeAll();
}
