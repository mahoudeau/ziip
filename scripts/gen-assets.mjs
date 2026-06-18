// Rasterize the SVG sources in public/ into the PNGs referenced by index.html
// and site.webmanifest. Run manually after changing a source SVG:
//
//   node scripts/gen-assets.mjs
//
// Uses the system `rsvg-convert` (librsvg) — no npm dependency. The generated
// PNGs are committed, so the build itself never runs this.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** [source svg, output png, width, height] */
const TARGETS = [
  ['og-image.svg', 'og-image.png', 1200, 630],
  ['favicon.svg', 'apple-touch-icon.png', 180, 180],
  ['favicon.svg', 'icon-192.png', 192, 192],
  ['favicon.svg', 'icon-512.png', 512, 512],
];

for (const [src, out, w, h] of TARGETS) {
  execFileSync('rsvg-convert', [
    '-w', String(w),
    '-h', String(h),
    join(publicDir, src),
    '-o', join(publicDir, out),
  ]);
  console.log(`✓ ${out} (${w}×${h})`);
}
