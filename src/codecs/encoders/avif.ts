import avifEncode from '@jsquash/avif/encode';

export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  return avifEncode(imageData, options);
}
