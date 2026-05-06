import type { CodecId } from '../codecs/types';
import { decodeJxlBytes } from './decode';

/**
 * Returns an object URL the browser can render directly. Most codecs (jpeg,
 * webp, avif, png) decode natively from `<img>`. JXL doesn't in Chrome /
 * Firefox, so we transcode JXL → ImageData → PNG blob → object URL.
 */
export async function getRenderablePreviewUrl(blob: Blob, codec: CodecId): Promise<string> {
  if (codec !== 'jxl') {
    return URL.createObjectURL(blob);
  }
  const bytes = await blob.arrayBuffer();
  const imageData = await decodeJxlBytes(bytes);
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for JXL preview');
  ctx.putImageData(imageData, 0, 0);
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  return URL.createObjectURL(pngBlob);
}
