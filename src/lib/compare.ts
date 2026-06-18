/** A reference quantity to phrase byte counts in fun, geeky terms (FF7 discs,
 * floppy disks, Apollo's computer, etc.). */
export interface Reference {
  /** Stable slug — also the key into PIXEL_ART (src/lib/pixelArt.ts). */
  id: string;
  label: string;
  size: number;
  /** Emoji fallback, shown until a pixel icon is drawn for this id. */
  icon: string;
}

const KB = 1024;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const REFERENCES: ReadonlyArray<Reference> = [
  { id: 'tweet', label: 'tweet', size: 280, icon: '🐦' },
  { id: 'punchcard', label: 'punch card', size: 80, icon: '📇' },
  { id: 'apollo', label: 'Apollo 11 guidance computer', size: 4 * KB, icon: '🚀' },
  { id: 'atari', label: 'Atari 2600 cartridge', size: 4 * KB, icon: '🕹️' },
  { id: 'smb', label: 'copy of Super Mario Bros.', size: 40 * KB, icon: '🍄' },
  { id: 'mac128k', label: 'Macintosh 128K’s memory', size: 128 * KB, icon: '🖥️' },
  { id: 'nes', label: 'NES cartridge', size: 256 * KB, icon: '🎮' },
  { id: 'pokemon', label: 'copy of Pokémon Red/Blue', size: 1 * MB, icon: '🔴' },
  { id: 'floppy', label: '3.5″ floppy disk', size: 1.44 * MB, icon: '💾' },
  { id: 'doom', label: 'DOOM (1993) install', size: 2.39 * MB, icon: '👹' },
  { id: 'chronotrigger', label: 'copy of Chrono Trigger', size: 4 * MB, icon: '⏳' },
  { id: 'mp3', label: '3-min MP3 @ 320 kbps', size: 7 * MB, icon: '🎵' },
  { id: 'sm64', label: 'copy of Super Mario 64', size: 8 * MB, icon: '⭐' },
  { id: 'gameboy', label: 'Game Boy cartridge (max)', size: 8 * MB, icon: '👾' },
  { id: 'win95', label: 'Windows 95 install', size: 40 * MB, icon: '🪟' },
  { id: 'quake', label: 'Quake (1996) install', size: 50 * MB, icon: '🔺' },
  { id: 'n64', label: 'N64 cartridge (Conker)', size: 64 * MB, icon: '🎮' },
  { id: 'zipdisk', label: 'Zip disk', size: 100 * MB, icon: '💽' },
  { id: 'laserdisc', label: 'LaserDisc (per side)', size: 540 * MB, icon: '📀' },
  { id: 'ps1', label: 'PlayStation 1 disc', size: 700 * MB, icon: '💿' },
  { id: 'ff7', label: 'copy of Final Fantasy VII (all 3 discs)', size: 3 * 660 * MB, icon: '⚔️' },
  { id: 'ipodnano', label: 'iPod Nano (1st gen)', size: 1 * GB, icon: '🎧' },
  { id: 'switch', label: 'Nintendo Switch cartridge (max)', size: 32 * GB, icon: '🎴' },
  { id: 'dvd', label: 'DVD (single layer)', size: 4.7 * GB, icon: '📀' },
  { id: 'ipod', label: 'original iPod (2001)', size: 5 * GB, icon: '🎶' },
  { id: 'bluray', label: 'Blu-ray (single layer)', size: 25 * GB, icon: '📀' },
  { id: 'bluray4k', label: '4K Blu-ray movie', size: 80 * GB, icon: '🎬' },
  { id: 'destiny2', label: 'Destiny 2 install', size: 180 * GB, icon: '🎮' },
  { id: 'iphone15', label: 'iPhone 15 (base)', size: 128 * GB, icon: '📱' },
];

export interface Comparison {
  id: string;
  icon: string;
  /** bytesSaved ÷ reference size; ≥ 1 whenever a reference fits. */
  multiple: number;
  label: string;
}

function toComparison(ref: Reference, bytesSaved: number): Comparison {
  return { id: ref.id, icon: ref.icon, multiple: bytesSaved / ref.size, label: ref.label };
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
  return toComparison(ref, bytesSaved);
}

/** Build a comparison for a specific reference id (used by the dev review
 * dropdown to preview any icon in the hero). */
export function comparisonForId(id: string, bytesSaved: number): Comparison | null {
  const ref = REFERENCES.find((r) => r.id === id);
  return ref ? toComparison(ref, Math.max(0, bytesSaved)) : null;
}

function smallestReference(): Reference {
  return REFERENCES.reduce((min, r) => (r.size < min.size ? r : min));
}

/** Multiples read as 1 decimal up to 10×, integers above. */
export function formatMultiple(m: number): string {
  return m <= 10 ? m.toFixed(1) : Math.round(m).toString();
}
