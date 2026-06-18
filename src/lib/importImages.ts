import { decodeImageFile, isLikelyImageFile } from './decode';
import { addImage, decodingCount } from '../state/images';
import { scheduleEncodeImage } from '../state/encode';
import { codec, options } from '../state/settings';
import { getDefaultPreset } from '../state/presets';

/**
 * Decode dropped/selected files and add them to the queue. Shared by the
 * dropzone, the queue's "+ Add", and the header mini-dropzone. Tracks in-flight
 * decodes via `decodingCount` and returns the first error message (or null).
 */
export async function importImageFiles(files: FileList | File[]): Promise<string | null> {
  let firstError: string | null = null;
  // Decode in parallel so each tile appears as soon as its decode finishes.
  await Promise.all(
    Array.from(files).map(async (file) => {
      if (!isLikelyImageFile(file)) {
        firstError ??= `"${file.name}" is not an image (${file.type || 'unknown type'}).`;
        return;
      }
      decodingCount.value++;
      try {
        const imageData = await decodeImageFile(file);
        const def = getDefaultPreset();
        const item = addImage({
          filename: file.name,
          originalBytes: file.size,
          originalImageData: imageData,
          originalBlob: file,
          codec: def ? def.codec : codec.peek(),
          options: def ? { ...def.options } : { ...options.peek() },
          presetId: def?.id,
        });
        scheduleEncodeImage(item.id);
      } catch (err) {
        firstError ??= `Could not decode "${file.name}". ${err instanceof Error ? err.message : ''}`;
      } finally {
        decodingCount.value--;
      }
    }),
  );
  return firstError;
}
