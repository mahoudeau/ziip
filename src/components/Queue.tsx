import { useRef, useState } from 'preact/hooks';
import { decodeImageFile } from '../lib/decode';
import { addImage, images } from '../state/images';
import { scheduleEncodeImage } from '../state/encode';
import { codec, options, setCodec, setOptions } from '../state/settings';
import { CODECS } from '../codecs/registry';
import { QueueItem } from './QueueItem';
import { CodecPicker } from './CodecPicker';
import { CodecOptionsPanel } from './CodecOptionsPanel';
import { PresetsPanel } from './PresetsPanel';
import { PresetSaveModal } from './PresetSaveModal';
import { applyPresetToAll } from '../state/presets';

export function Queue() {
  const items = images.value;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showingPresets, setShowingPresets] = useState(false);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const meta = CODECS[codec.value];

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    let firstError: string | null = null;
    // Decode in parallel so each tile appears as soon as its decode finishes,
    // instead of one-by-one waiting for each previous decode to complete.
    await Promise.all(
      Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          firstError ??= `Skipped "${file.name}" — not an image.`;
          return;
        }
        try {
          const imageData = await decodeImageFile(file);
          const added = addImage({
            filename: file.name,
            originalBytes: file.size,
            originalImageData: imageData,
            originalBlob: file,
            codec: codec.peek(),
            options: { ...options.peek() },
          });
          scheduleEncodeImage(added.id);
        } catch (err) {
          firstError ??= `Could not decode "${file.name}". ${err instanceof Error ? err.message : ''}`;
        }
      }),
    );
    if (firstError) setError(firstError);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files.length) void handleFiles(e.dataTransfer.files);
  }

  function onChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files?.length) void handleFiles(input.files);
    input.value = '';
  }

  return (
    <div
      class={`min-h-full ${isDragging ? 'ring-2 ring-zinc-300 ring-inset' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <div class="grid lg:grid-cols-[1fr_400px] gap-6 max-w-7xl mx-auto items-start">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">
              {items.length} image{items.length === 1 ? '' : 's'}
            </h2>
            <button
              class="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-100 rounded hover:bg-zinc-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              + Add images
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
          {error && <p class="mb-4 text-sm text-red-400">{error}</p>}
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => (
              <QueueItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        <aside class="bg-zinc-900 rounded-xl p-6 space-y-6 self-start lg:sticky lg:top-6">
          <div>
            <p class="text-xs uppercase tracking-wide text-zinc-500 font-medium">Settings</p>
            <p class="text-xs text-zinc-400 mt-1">Apply to every image in the queue.</p>
          </div>
          <CodecPicker
            value={codec.value}
            showingPresets={showingPresets}
            onSelectCodec={(c) => {
              setShowingPresets(false);
              if (c !== codec.value) setCodec(c);
            }}
            onSelectPresets={() => setShowingPresets(true)}
          />

          {showingPresets ? (
            <PresetsPanel
              onApply={(pid) => applyPresetToAll(pid)}
              applyLabel="Apply to all images"
            />
          ) : (
            <>
              <CodecOptionsPanel meta={meta} values={options.value} onChange={setOptions} />
              <div class="pt-1 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSavePresetOpen(true)}
                  class="w-full text-xs text-zinc-400 hover:text-zinc-100 py-1.5 px-2 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  Save current settings as preset…
                </button>
              </div>
            </>
          )}

          {savePresetOpen && (
            <PresetSaveModal
              codec={codec.value}
              options={options.value}
              onClose={() => setSavePresetOpen(false)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
