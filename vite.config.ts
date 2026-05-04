import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'lab' ? '/ziip/' : '/',
  plugins: [preact(), tailwindcss()],
  // jsquash codecs resolve their .wasm via import.meta.url. Vite's dep
  // prebundling rewrites that URL incorrectly, so the dev server returns
  // index.html (HTML) where the codec expects bytes (Wasm). Add each new
  // jsquash package here as we wire it up in later phases.
  optimizeDeps: {
    exclude: ['@jsquash/jpeg'],
  },
}));
