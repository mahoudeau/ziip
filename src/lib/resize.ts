/**
 * Resize an `ImageData` to target dimensions using the browser's high-quality
 * canvas resampler. Dependency-free and runs on the main thread, mirroring how
 * crop is applied just before encode (see state/encode.ts). Pipeline order is
 * `decode → crop → resize → encode`.
 *
 * If lanczos-grade quality is ever required, swap the body for `@jsquash/resize`
 * (and add it to `optimizeDeps.exclude` in vite.config.ts).
 */
export async function resizeImageData(
  src: ImageData,
  width: number,
  height: number,
): Promise<ImageData> {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w === src.width && h === src.height) return src;

  const bitmap = await createImageBitmap(src);
  try {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context for resize');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    bitmap.close();
  }
}
