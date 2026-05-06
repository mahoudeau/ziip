export {};
declare const self: DedicatedWorkerGlobalScope;

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

async function decodeFile(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function decodeJxl(bytes: ArrayBuffer): Promise<ImageData> {
  // Lazy-imported so the JXL Wasm only loads when a JXL preview is actually
  // requested. The same module is already used in encoder mode by the
  // compress worker, so the chunk is shared.
  const decode = (await import('@jsquash/jxl/decode')).default;
  return decode(bytes);
}

self.onmessage = async (e: MessageEvent<DecodeJob>) => {
  const { id, source } = e.data;
  try {
    const imageData =
      source.kind === 'file' ? await decodeFile(source.file) : await decodeJxl(source.bytes);
    const buffer = imageData.data.buffer;
    const result: DecodeResult = {
      id,
      ok: true,
      bytes: buffer,
      width: imageData.width,
      height: imageData.height,
    };
    self.postMessage(result, [buffer]);
  } catch (err) {
    const result: DecodeResult = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(result);
  }
};
