/** A reference quantity to phrase byte counts in fun terms (DOOM installs,
 * floppy disks, etc.). Picked from PROJECT.md §7.7. */
export interface Reference {
  label: string;
  size: number;
  era?: string;
}

const KB = 1024;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const REFERENCES: ReadonlyArray<Reference> = [
  { label: 'punch card', size: 80 },
  { label: 'Atari 2600 cartridge', size: 4 * KB, era: '1977' },
  { label: 'NES cartridge', size: 256 * KB, era: '1985' },
  { label: '3.5″ floppy disk', size: 1.44 * MB, era: '1986' },
  { label: 'DOOM (1993) install', size: 2.39 * MB, era: '1993' },
  { label: 'N64 Expansion Pak', size: 4 * MB, era: '1998' },
  { label: '3 min MP3 @ 320 kbps', size: 7 * MB },
  { label: 'Game Boy cartridge (max)', size: 8 * MB, era: '1989' },
  { label: 'Zip disk', size: 100 * MB, era: '1994' },
  { label: 'LaserDisc side', size: 540 * MB, era: '1978' },
  { label: 'N64 cartridge (Conker)', size: 64 * MB, era: '2001' },
  { label: 'CD-ROM', size: 700 * MB, era: '1985' },
  { label: 'iPod Nano (1st gen)', size: 1 * GB, era: '2005' },
  { label: 'first iPhone (base)', size: 4 * GB, era: '2007' },
  { label: 'DVD (single layer)', size: 4.7 * GB, era: '1996' },
  { label: 'original iPod (2001)', size: 5 * GB, era: '2001' },
  { label: 'Blu-ray (single layer)', size: 25 * GB, era: '2006' },
  { label: '4K Blu-ray movie', size: 80 * GB },
  { label: 'iPhone 15 (base)', size: 128 * GB, era: '2023' },
];

/** Pick the largest reference that fits in `bytesSaved`. Returns null if
 * `bytesSaved` is below every reference (or non-positive). */
export function bestComparison(
  bytesSaved: number,
): { ref: Reference; multiple: number } | null {
  if (bytesSaved <= 0) return null;
  const sorted = [...REFERENCES].sort((a, b) => b.size - a.size);
  for (const ref of sorted) {
    if (ref.size <= bytesSaved) return { ref, multiple: bytesSaved / ref.size };
  }
  return null;
}

export function formatComparison(bytesSaved: number): string | null {
  const c = bestComparison(bytesSaved);
  if (!c) return null;
  const m = c.multiple;
  const display = m <= 10 ? m.toFixed(1) : Math.round(m).toString();
  return `${display}× ${c.ref.label}`;
}
