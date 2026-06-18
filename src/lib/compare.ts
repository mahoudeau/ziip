/** A reference quantity to phrase byte counts in fun, geeky terms (FF7 discs,
 * floppy disks, Apollo's computer, etc.). */
export interface Reference {
  label: string;
  size: number;
  /** Emoji graphic shown next to the comparison. */
  icon: string;
}

const KB = 1024;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const REFERENCES: ReadonlyArray<Reference> = [
  { label: 'tweet', size: 280, icon: '🐦' },
  { label: 'punch card', size: 80, icon: '📇' },
  { label: 'Apollo 11 guidance computer', size: 4 * KB, icon: '🚀' },
  { label: 'Atari 2600 cartridge', size: 4 * KB, icon: '🕹️' },
  { label: 'copy of Super Mario Bros.', size: 40 * KB, icon: '🍄' },
  { label: 'Macintosh 128K’s memory', size: 128 * KB, icon: '🖥️' },
  { label: 'NES cartridge', size: 256 * KB, icon: '🎮' },
  { label: 'copy of Pokémon Red/Blue', size: 1 * MB, icon: '🔴' },
  { label: '3.5″ floppy disk', size: 1.44 * MB, icon: '💾' },
  { label: 'DOOM (1993) install', size: 2.39 * MB, icon: '👹' },
  { label: 'copy of Chrono Trigger', size: 4 * MB, icon: '⏳' },
  { label: '3-min MP3 @ 320 kbps', size: 7 * MB, icon: '🎵' },
  { label: 'copy of Super Mario 64', size: 8 * MB, icon: '⭐' },
  { label: 'Game Boy cartridge (max)', size: 8 * MB, icon: '👾' },
  { label: 'Windows 95 install', size: 40 * MB, icon: '🪟' },
  { label: 'Quake (1996) install', size: 50 * MB, icon: '🔺' },
  { label: 'N64 cartridge (Conker)', size: 64 * MB, icon: '🎮' },
  { label: 'Zip disk', size: 100 * MB, icon: '💽' },
  { label: 'LaserDisc (per side)', size: 540 * MB, icon: '📀' },
  { label: 'PlayStation 1 disc', size: 700 * MB, icon: '💿' },
  { label: 'copy of Final Fantasy VII (all 3 discs)', size: 3 * 660 * MB, icon: '⚔️' },
  { label: 'iPod Nano (1st gen)', size: 1 * GB, icon: '🎧' },
  { label: 'Nintendo Switch cartridge (max)', size: 32 * GB, icon: '🎴' },
  { label: 'DVD (single layer)', size: 4.7 * GB, icon: '📀' },
  { label: 'original iPod (2001)', size: 5 * GB, icon: '🎶' },
  { label: 'Blu-ray (single layer)', size: 25 * GB, icon: '📀' },
  { label: '4K Blu-ray movie', size: 80 * GB, icon: '🎬' },
  { label: 'Destiny 2 install', size: 180 * GB, icon: '🎮' },
  { label: 'iPhone 15 (base)', size: 128 * GB, icon: '📱' },
];

export interface Comparison {
  icon: string;
  /** bytesSaved ÷ reference size; ≥ 1 whenever a reference fits. */
  multiple: number;
  label: string;
}

/**
 * Pick a **random** reference that fits within `bytesSaved` (so the "you've
 * saved N×" framing stays sensible, N ≥ 1). Falls back to the smallest
 * reference if savings are below all of them. Returns null for non-positive
 * savings. Call once per render and reuse the result — it uses `Math.random`.
 */
export function pickComparison(bytesSaved: number): Comparison | null {
  if (bytesSaved <= 0) return null;
  const fitting = REFERENCES.filter((r) => r.size <= bytesSaved);
  const pool = fitting.length > 0 ? fitting : [smallestReference()];
  const ref = pool[Math.floor(Math.random() * pool.length)]!;
  return { icon: ref.icon, multiple: bytesSaved / ref.size, label: ref.label };
}

function smallestReference(): Reference {
  return REFERENCES.reduce((min, r) => (r.size < min.size ? r : min));
}

/** Multiples read as 1 decimal up to 10×, integers above. */
export function formatMultiple(m: number): string {
  return m <= 10 ? m.toFixed(1) : Math.round(m).toString();
}
