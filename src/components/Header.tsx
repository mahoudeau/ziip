import { Wordmark } from './ui/Logo';
import { navigate, route, type Route } from '../state/route';

const LINKS: ReadonlyArray<{ id: Route; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'about', label: 'About' },
];

export function Header() {
  const current = route.value;
  return (
    <header class="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-md">
      <div class="px-6 lg:px-8 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate('home')}
          class="text-2xl text-ink shrink-0 cursor-pointer"
          aria-label="Ziip — home"
        >
          <Wordmark />
        </button>
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
    </header>
  );
}
