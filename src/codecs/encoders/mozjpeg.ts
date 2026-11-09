import jpegEncode from '@jsquash/jpeg/encode';

/** JPEG has no alpha channel, and the encoder would just drop it, turning
 * transparent areas black. Composite over white instead. The buffer is this
 * worker's own clone, so changing it in place is safe. */
function flattenOnWhite(image: ImageData): void {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!;
    if (alpha === 255) continue;
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.round((data[i + c]! * alpha + 255 * (255 - alpha)) / 255);
    }
    data[i + 3] = 255;
  }
}

export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  flattenOnWhite(imageData);
  // auto_subsample defaults to true and makes the encoder ignore chroma_subsample.
  return jpegEncode(imageData, { ...options, auto_subsample: false });
}
