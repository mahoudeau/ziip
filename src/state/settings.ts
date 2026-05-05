import { signal } from '@preact/signals';
import { CODECS } from '../codecs/registry';
import type { CodecId } from '../codecs/types';

// Global codec + options. The same settings apply to every image in the
// queue. Per-image state (crop, encoded result, status) lives in
// state/images.ts.
export const codec = signal<CodecId>('mozjpeg');
export const options = signal<Record<string, unknown>>({ ...CODECS.mozjpeg.defaults });

export function setCodec(next: CodecId): void {
  if (codec.value === next) return;
  codec.value = next;
  options.value = { ...CODECS[next].defaults };
}

export function setOptions(next: Record<string, unknown>): void {
  options.value = next;
}
