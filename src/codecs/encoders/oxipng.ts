import pngEncode from '@jsquash/png/encode';
import oxipngOptimise from '@jsquash/oxipng/optimise';

// OxiPNG operates on encoded PNG bytes, not ImageData. We first encode via
// @jsquash/png, then optimise the result. This keeps the codec API uniform
// (ImageData → ArrayBuffer) at the cost of one extra pass.
export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const png = await pngEncode(imageData);
  return oxipngOptimise(png, options);
}
