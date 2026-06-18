import { useEffect, useRef, useState } from 'preact/hooks';
import { Wordmark } from './ui/Logo';
import { importImageFiles } from '../lib/importImages';
import { images } from '../state/images';
import { navigate, route, type Route } from '../state/route';

const LINKS: ReadonlyArray<{ id: Route; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'about', label: 'About' },
];

function linkClass(active: boolean): string {
  return `px-3 py-1.5 rounded-lg font-medium transition-colors ${
    active ? 'bg-brand/10 text-brand' : 'text-muted hover:text-ink hover:bg-elevated'
  }`;
}

export function Header() {
  const current = route.value;
  // Show the quick-add everywhere except the empty home, which has its own big
  // dropzone. On home with a queue it stands in for the queue's add button.
  const showAdd = current !== 'home' || images.value.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

          {/* Desktop / tablet: inline nav */}
          <nav aria-label="Primary" class="hidden sm:flex items-center gap-1 text-sm">
            {LINKS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => navigate(l.id)}
                aria-current={current === l.id ? 'page' : undefined}
                class={linkClass(current === l.id)}
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Mobile: collapse the nav into a burger dropdown */}
          <div ref={menuRef} class="relative sm:hidden">
            <button
              type="button"
              aria-label="Menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((o) => !o)}
              class="grid place-items-center p-2 rounded-lg text-ink hover:bg-elevated transition-colors"
            >
              <svg viewBox="0 0 16 16" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M2 4h12M2 8h12M2 12h12" stroke-linecap="round" />
              </svg>
            </button>
            {menuOpen && (
              <nav
                id="mobile-nav"
                aria-label="Primary"
                class="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-surface shadow-lg p-1.5 flex flex-col text-sm"
              >
                {LINKS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      navigate(l.id);
                      setMenuOpen(false);
                    }}
                    aria-current={current === l.id ? 'page' : undefined}
                    class={`text-left ${linkClass(current === l.id)}`}
                  >
                    {l.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
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
      aria-label="Add images to compress"
      title="Drop or choose images to compress"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
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
