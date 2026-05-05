import type { CodecId, EncodeJob, EncodeResult } from '../codecs/types';

declare const self: DedicatedWorkerGlobalScope;

async function loadEncoder(codec: CodecId) {
  switch (codec) {
    case 'mozjpeg':
      return (await import('../codecs/encoders/mozjpeg')).encode;
    case 'webp':
      return (await import('../codecs/encoders/webp')).encode;
    case 'avif':
      return (await import('../codecs/encoders/avif')).encode;
    case 'jxl':
      return (await import('../codecs/encoders/jxl')).encode;
    case 'oxipng':
      return (await import('../codecs/encoders/oxipng')).encode;
  }
}

self.onmessage = async (e: MessageEvent<EncodeJob>) => {
  const job = e.data;
  const start = performance.now();
  try {
    const encode = await loadEncoder(job.codec);
    const buffer = await encode(job.imageData, job.options);
    const result: EncodeResult = {
      id: job.id,
      ok: true,
      buffer,
      msElapsed: performance.now() - start,
    };
    self.postMessage(result, [buffer]);
  } catch (err) {
    const result: EncodeResult = {
      id: job.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(result);
  }
};
