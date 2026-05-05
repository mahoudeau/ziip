import jxlEncode from '@jsquash/jxl/encode';

export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  // jsquash/jxl encodes losslessly when quality === 100.
  const opts: Record<string, unknown> = { ...options };
  if (opts.lossless === true) opts.quality = 100;
  delete opts.lossless;
  return jxlEncode(imageData, opts);
}
