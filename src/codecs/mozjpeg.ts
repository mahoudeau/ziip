type EncodeFn = (data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>;

let encodePromise: Promise<EncodeFn> | null = null;

// Lazy-loaded so the ~500 KB MozJPEG Wasm only ships when the user actually
// encodes something. Future codecs (webp, avif, jxl, oxipng) follow the same
// pattern in their own modules.
function loadEncoder(): Promise<EncodeFn> {
  if (!encodePromise) {
    encodePromise = import('@jsquash/jpeg/encode').then((mod) => mod.default as EncodeFn);
  }
  return encodePromise;
}

export async function encodeMozJpeg(imageData: ImageData, quality: number): Promise<ArrayBuffer> {
  const encode = await loadEncoder();
  return encode(imageData, { quality });
}
