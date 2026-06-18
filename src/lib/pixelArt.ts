import type { PixelArt } from '../components/ui/PixelIcon';

/**
 * Pixel art per reference id (see REFERENCES in compare.ts). Authored as 16×16
 * ASCII grids — '.' is transparent, other chars map to `colors`. References
 * without an entry here fall back to their emoji until we draw them.
 *
 * Two seeds below show the format; the rest get drawn collaboratively.
 */
export const PIXEL_ART: Record<string, PixelArt> = {
  floppy: {
    colors: { K: '#33415c', S: '#cdd6e3', M: '#8b94a6', L: '#f5f7fb', B: '#5b7cfa' },
    rows: [
      '................',
      '.KKKKKKKKKKKKKK.',
      '.KSSSSSSSSSSSSK.',
      '.KSSSMMMMSSSSSK.',
      '.KSSSMMMMSSSSSK.',
      '.KKKKKKKKKKKKKK.',
      '.KKLLLLLLLLLLKK.',
      '.KKLLLLLLLLLLKK.',
      '.KKLBBBBBBBBLKK.',
      '.KKLLLLLLLLLLKK.',
      '.KKLLLLLLLLLLKK.',
      '.KKLLLLLLLLLLKK.',
      '.KKLLLLLLLLLLKK.',
      '.KKKKKKKKKKKKKK.',
      '................',
      '................',
    ],
  },
  gameboy: {
    colors: { G: '#9c9c9c', D: '#6f6f6f', L: '#dcdcd0' },
    rows: [
      '................',
      '..GGGGGGGGGG....',
      '..GGGGGGGGGGGG..',
      '..GDDDDDDDDDDG..',
      '..GDLLLLLLLLDG..',
      '..GDLLLLLLLLDG..',
      '..GDLLLLLLLLDG..',
      '..GDLLLLLLLLDG..',
      '..GDLLLLLLLLDG..',
      '..GDDDDDDDDDDG..',
      '..GGGGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '................',
    ],
  },
};
