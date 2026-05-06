import { useRef, useState } from 'preact/hooks';
import { decodeImageFile } from '../lib/decode';
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
        if (!file.type.startsWith('image/')) {
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
      class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-8"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div
        class={`border-2 border-dashed rounded-2xl p-16 text-center transition-colors ${
          isDragging ? 'border-zinc-300 bg-zinc-900/40' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <h1 class="text-6xl font-bold tracking-tight mb-3">Ziip</h1>
        <p class="text-zinc-400 mb-8 max-w-sm mx-auto">
          Drop images to compress them. Files never leave your device.
        </p>
        <button
          class="px-6 py-3 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-white transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          onChange={onChange}
        />
      </div>
      {error && <p class="mt-6 text-sm text-red-400 max-w-md text-center">{error}</p>}
    </div>
  );
}
