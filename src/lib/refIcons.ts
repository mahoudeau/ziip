/**
 * Maps a reference id (the `id` slugs in compare.ts) to a user-supplied icon
 * asset. Drop a file named `<id>.svg` (or .png/.webp/.jpg) into
 * `src/assets/icons/` and it auto-maps by filename — no code change needed.
 * References without a matching file fall back to their emoji in the UI.
 */
const modules = import.meta.glob('../assets/icons/*.{svg,png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const path in modules) {
  const id = path
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '');
  ICONS[id] = modules[path]!;
}

/** Resolved icon URL for a reference id, or undefined if no file was dropped. */
export function iconForId(id: string): string | undefined {
  return ICONS[id];
}
