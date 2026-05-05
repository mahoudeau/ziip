import webpEncode from '@jsquash/webp/encode';

export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  // @jsquash/webp uses numeric flags for lossless (0/1).
  const opts: Record<string, unknown> = { ...options };
  if (typeof opts.lossless === 'boolean') opts.lossless = opts.lossless ? 1 : 0;
  return webpEncode(imageData, opts);
}
