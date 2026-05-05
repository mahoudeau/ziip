import jpegEncode from '@jsquash/jpeg/encode';

export async function encode(
  imageData: ImageData,
  options: Record<string, unknown>,
): Promise<ArrayBuffer> {
  return jpegEncode(imageData, options);
}
