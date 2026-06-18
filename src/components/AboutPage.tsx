import { CODEC_IDS, CODECS } from '../codecs/registry';

const FEATURES: ReadonlyArray<[string, string]> = [
  ['Batch workflow', 'Drop, paste, or pick many images and compress them all at once.'],
  ['Five codecs', 'MozJPEG, WebP, AVIF, JPEG XL and OxiPNG. Choose per image or for the whole queue.'],
  ['Presets', 'Save your favourite settings, reuse them, and track how much space they’ve saved.'],
  ['Crop', 'Pixel-precise crop with aspect-ratio locks and a live grid at high zoom.'],
  ['Resize', 'Quick ×0.25 to ×3 presets, or a custom width and height with aspect ratio always locked.'],
  ['Compare', 'Side-by-side before/after slider with pan and zoom.'],
  ['Dashboard', 'Total bytes saved, a format breakdown, and fun real-world comparisons.'],
  ['Download', 'Grab images one at a time or all together as a single zip.'],
];

const INPUT_FORMATS = ['JPEG', 'PNG', 'WebP', 'AVIF', 'GIF', 'BMP', 'SVG (rasterized)', 'HEIC / HEIF'];

export function AboutPage() {
  return (
    <div class="px-6 lg:px-8 pt-4 pb-16 max-w-3xl mx-auto">
      <h1 class="text-3xl font-display font-semibold tracking-tight mb-3">What is Ziip?</h1>
      <p class="text-muted text-lg mb-8">
        Ziip is a fast, private image compressor that runs entirely in your browser. Shrink
        photos and graphics to modern formats, with no uploads, no limits, and no fuss.
      </p>

      <section class="bg-surface rounded-2xl p-6 shadow-sm mb-4">
        <h3 class="font-display font-semibold text-lg mb-4">Features</h3>
        <dl class="grid sm:grid-cols-2 gap-x-6 gap-y-3.5">
          {FEATURES.map(([title, desc]) => (
            <div key={title}>
              <dt class="font-medium text-ink">{title}</dt>
              <dd class="text-sm text-muted">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div class="grid sm:grid-cols-2 gap-4">
        <section class="bg-surface rounded-2xl p-6 shadow-sm">
          <h3 class="font-display font-semibold text-lg">Reads</h3>
          <p class="text-xs text-faint mb-3">Input formats</p>
          <ul class="flex flex-wrap gap-2">
            {INPUT_FORMATS.map((f) => (
              <li key={f} class="px-2.5 py-1 text-sm rounded-lg bg-elevated text-ink">{f}</li>
            ))}
          </ul>
        </section>
        <section class="bg-surface rounded-2xl p-6 shadow-sm">
          <h3 class="font-display font-semibold text-lg">Writes</h3>
          <p class="text-xs text-faint mb-3">Output formats</p>
          <ul class="space-y-2">
            {CODEC_IDS.map((id) => (
              <li key={id} class="flex items-center justify-between text-sm">
                <span class="text-ink font-medium">{CODECS[id].name}</span>
                <span class="text-faint uppercase tabular-nums">.{CODECS[id].outputExt}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
