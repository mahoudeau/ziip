import { useRef, useState } from 'preact/hooks';
import { Wordmark } from './ui/Logo';
import { importImageFiles } from '../lib/importImages';
import { images } from '../state/images';
import { navigate, route, type Route } from '../state/route';

const LINKS: ReadonlyArray<{ id: Route; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'about', label: 'About' },
];

export function Header() {
  const current = route.value;
  // Show the quick-add everywhere except the empty home, which has its own big
  // dropzone. On home with a queue it stands in for the queue's add button.
  const showAdd = current !== 'home' || images.value.length > 0;
  return (
    <header class="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <div class="px-6 lg:px-8 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate('home')}
          class="text-2xl text-ink shrink-0 cursor-pointer"
          aria-label="Ziip home"
        >
          <Wordmark />
        </button>
        <div class="flex items-center gap-3 sm:gap-5">
          {showAdd && <MiniDropzone />}
          <nav class="flex items-center gap-1 text-sm">
            {LINKS.map((l) => {
              const active = current === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => navigate(l.id)}
                  aria-current={active ? 'page' : undefined}
                  class={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    active ? 'bg-brand/10 text-brand' : 'text-muted hover:text-ink hover:bg-elevated'
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

/** Compact drop target + picker in the header so images can be added from any
 * page. Fires the import and jumps straight to the queue (which shows the
 * decoding indicator) so a slow HEIC decode never looks frozen. */
function MiniDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function take(files: FileList | File[]) {
    void importImageFiles(files);
    navigate('home');
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title="Drop or choose images to compress"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer?.files.length) take(e.dataTransfer.files);
      }}
      class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-brand cursor-pointer transition-colors ${
        dragging ? 'bg-brand-strong ring-2 ring-brand/40' : 'hover:bg-brand-strong'
      }`}
    >
      <svg viewBox="0 0 16 16" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M8 3.5v9M3.5 8h9" stroke-linecap="round" />
      </svg>
      <span class="hidden sm:inline">Add images</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.svg"
        multiple
        class="hidden"
        onChange={(e) => {
          const input = e.currentTarget as HTMLInputElement;
          if (input.files?.length) take(input.files);
          input.value = '';
        }}
      />
    </div>
  );
}
