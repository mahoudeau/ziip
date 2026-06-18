import { signal } from '@preact/signals';

export type Route = 'home' | 'dashboard' | 'privacy' | 'about';

const PAGES: readonly string[] = ['dashboard', 'privacy', 'about'];

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '').toLowerCase();
  return PAGES.includes(h) ? (h as Route) : 'home';
}

/** Current page, synced to `location.hash`. Hash routing is base-path-agnostic,
 * so it works the same on the lab `/ziip/` subpath and the prod root. */
export const route = signal<Route>(parseHash());

window.addEventListener('hashchange', () => {
  route.value = parseHash();
});

export function navigate(to: Route): void {
  const hash = to === 'home' ? '' : `#${to}`;
  if (location.hash === hash) {
    route.value = to; // already there (e.g. clicking the active link) — no hashchange fires
  } else {
    location.hash = hash; // triggers hashchange → updates the signal
  }
  window.scrollTo({ top: 0 });
}
