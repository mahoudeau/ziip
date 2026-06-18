import { useRef, useState } from 'preact/hooks';
import { importImageFiles } from '../lib/importImages';
import { Wordmark } from './ui/Logo';
import { Spinner } from './ui/Spinner';
import { decodingCount } from '../state/images';

export function DropZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const err = await importImageFiles(files);
    if (err) setError(err);
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
        <h1 class="text-6xl text-ink text-center mb-3">
          <Wordmark />
        </h1>
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
        {decodingCount.value > 0 && (
          <p class="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Spinner size={14} />
            Decoding {decodingCount.value} image{decodingCount.value === 1 ? '' : 's'}…
          </p>
        )}
      </div>
      {error && <p class="mt-6 text-sm text-red-600 max-w-md text-center">{error}</p>}
    </div>
  );
}
