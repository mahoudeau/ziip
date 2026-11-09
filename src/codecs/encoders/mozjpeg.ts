import jpegEncode from '@jsquash/jpeg/encode';

export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  // auto_subsample defaults to true and makes the encoder ignore chroma_subsample.
  return jpegEncode(imageData, { ...options, auto_subsample: false });
}
