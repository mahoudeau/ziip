import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => ({
  base: mode === 'lab' ? '/ziip/' : '/',
  plugins: [preact(), tailwindcss(), cloudflare()],
  // jsquash codecs resolve their .wasm via import.meta.url. Vite's dep
  // prebundling rewrites that URL incorrectly, so the dev server returns
  // index.html (HTML) where the codec expects bytes (Wasm). Add each new
  // jsquash package here as we wire it up in later phases.
  optimizeDeps: {
    exclude: [
      '@jsquash/jpeg',
      '@jsquash/webp',
      '@jsquash/avif',
      '@jsquash/jxl',
      '@jsquash/oxipng',
      '@jsquash/png',
    ],
  },
  // The compress worker uses dynamic imports to lazy-load codec modules
  // (one chunk per codec). That requires ES module format; Vite's default
  // IIFE doesn't support code-splitting in workers.
  worker: {
    format: 'es',
  },
}));