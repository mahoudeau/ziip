export {};
declare const self: DedicatedWorkerGlobalScope;

interface DecodeJob {
  id: number;
  file: File;
}

type DecodeResult =
  | { id: number; ok: true; bytes: ArrayBuffer; width: number; height: number }
  | { id: number; ok: false; error: string };

self.onmessage = async (e: MessageEvent<DecodeJob>) => {
  const { id, file } = e.data;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
