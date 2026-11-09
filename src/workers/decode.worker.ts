export {};
declare const self: DedicatedWorkerGlobalScope;

type DecodeSource =
  | { kind: 'file'; file: File }
  | { kind: 'tiff'; file: File }
  | { kind: 'jxl'; bytes: ArrayBuffer };

interface DecodeJob {
  id: number;
  source: DecodeSource;
}

type DecodeResult =
  | { id: number; ok: true; bytes: ArrayBuffer; width: number; height: number; notice?: string }
  | { id: number; ok: false; error: string };

interface Decoded {
  imageData: ImageData;
  notice?: string;
}

async function decodeFile(file: Blob): Promise<ImageData> {
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

async function decodeTiffFile(file: File): Promise<Decoded> {
  // Lazy-imported so the decoder only loads when a TIFF is actually dropped.
  const { decodeTiff } = await import('./decodeTiff');
  return decodeTiff(file, decodeFile);
}

async function decodeSource(source: DecodeSource): Promise<Decoded> {
  if (source.kind === 'tiff') return decodeTiffFile(source.file);
  if (source.kind === 'file') return { imageData: await decodeFile(source.file) };
  return { imageData: await decodeJxl(source.bytes) };
}

self.onmessage = async (e: MessageEvent<DecodeJob>) => {
  const { id, source } = e.data;
  try {
    const { imageData, notice } = await decodeSource(source);
    const buffer = imageData.data.buffer;
    const result: DecodeResult = {
      id,
      ok: true,
      bytes: buffer,
      width: imageData.width,
      height: imageData.height,
      notice,
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
