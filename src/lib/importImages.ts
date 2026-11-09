import { decodeImageFile, isLikelyImageFile } from './decode';
import { addImage, decodingCount, importError } from '../state/images';
import { scheduleEncodeImage } from '../state/encode';
import { codec, options } from '../state/settings';
import { getDefaultPreset } from '../state/presets';
import { formatBytes } from './format';
import { images } from '../state/images';

/** Decoded pixels stay in memory for re-encodes, at 4 bytes per pixel. Past
 * this a tab is likely to run out of memory and lose the whole queue. */
const MAX_RETAINED_BYTES = 3 * 1024 ** 3;

/**
 * Decode dropped/selected files and add them to the queue. Shared by the
 * dropzone, the queue's "+ Add", and the header mini-dropzone. Tracks in-flight
 * decodes via `decodingCount` and reports failures through `importError`.
 */
export async function importImageFiles(files: FileList | File[]): Promise<void> {
  importError.value = null;
  let firstError: string | null = null;
  let failed = 0;
  // Decode in parallel so each tile appears as soon as its decode finishes.
  await Promise.all(
    Array.from(files).map(async (file) => {
      if (!isLikelyImageFile(file)) {
        firstError ??= `"${file.name}" is not an image (${file.type || 'unknown type'}).`;
        failed++;
        return;
      }
      decodingCount.value++;
      try {
        const { imageData, notice } = await decodeImageFile(file);
        const retained = images.peek().reduce((sum, i) => sum + i.originalImageData.data.byteLength, 0);
        if (retained + imageData.data.byteLength > MAX_RETAINED_BYTES) {
          firstError ??= `No room for "${file.name}": Ziip is already holding ${formatBytes(retained)} of decoded images. Clear some and add it again.`;
          failed++;
          return;
        }
        const def = getDefaultPreset();
        const item = addImage({
          filename: file.name,
          originalBytes: file.size,
          originalImageData: imageData,
          originalBlob: file,
          notice,
          codec: def ? def.codec : codec.peek(),
          options: def ? { ...def.options } : { ...options.peek() },
          presetId: def?.id,
        });
        scheduleEncodeImage(item.id);
      } catch (err) {
        firstError ??= `Could not decode "${file.name}". ${err instanceof Error ? err.message : ''}`;
        failed++;
      } finally {
        decodingCount.value--;
      }
    }),
  );
  if (firstError) {
    const others = failed - 1;
    importError.value =
      others > 0 ? `${firstError} ${others} more file${others === 1 ? '' : 's'} also failed.` : firstError;
  }
}
