import { useRef, useState } from 'preact/hooks';
import { decodeImageFile, isLikelyImageFile } from '../lib/decode';
import { LogoMark } from './ui/Logo';
import { addImage } from '../state/images';
import { scheduleEncodeImage } from '../state/encode';
import { codec, options } from '../state/settings';
import { getDefaultPreset } from '../state/presets';

export function DropZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    let firstError: string | null = null;
    await Promise.all(
      Array.from(files).map(async (file) => {
        if (!isLikelyImageFile(file)) {
          firstError ??= `"${file.name}" is not an image (${file.type || 'unknown type'}).`;
          return;
        }
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
        }
      }),
    );
    if (firstError) setError(firstError);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files.length) void handleFiles(e.dataTransfer.files);
  }

  function onChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.length) void handleFiles(input.files);
    input.value = '';
  }

  return (
    <div
      class="flex flex-col items-center justify-center px-8 pt-8 pb-12"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div
        class={`w-full max-w-2xl border-2 border-dashed rounded-3xl p-16 text-center transition-colors ${
          isDragging
            ? 'border-brand bg-brand/5'
            : 'border-border bg-surface/60 hover:border-brand/50'
        }`}
      >
        <div class="flex items-center justify-center gap-3 mb-3">
          <LogoMark class="w-14 h-14 text-brand" />
          <h1 class="text-6xl font-display font-semibold tracking-tight">Ziip</h1>
        </div>
        <p class="text-muted mb-8 max-w-sm mx-auto">
          Drop images to compress them. Files never leave your device.
        </p>
        <button
          class="px-6 py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-strong transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,.svg"
          multiple
          class="hidden"
          onChange={onChange}
        />
      </div>
      {error && <p class="mt-6 text-sm text-red-600 max-w-md text-center">{error}</p>}
    </div>
  );
}
