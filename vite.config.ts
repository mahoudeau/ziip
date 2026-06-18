import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const base = mode === 'lab' ? '/ziip/' : '/';
  return {
    base,
    plugins: [preact(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      // Use the hand-written public/site.webmanifest instead of generating one.
      manifest: false,
      workbox: {
        // Precache the app shell (JS/CSS/HTML/fonts/icons). The large WASM
        // codecs are runtime-cached on first use instead, so the initial
        // install stays light.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ziip-wasm',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }), cloudflare()],
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
        // heic-to embeds libheif (wasm) and spins up its own blob-URL worker.
        // Leaving it un-prebundled keeps import.meta.url pointing at the real
        // package path so those internals resolve correctly in dev.
        'heic-to',
      ],
    },
    // The compress worker uses dynamic imports to lazy-load codec modules
    // (one chunk per codec). That requires ES module format; Vite's default
    // IIFE doesn't support code-splitting in workers.
    worker: {
      format: 'es',
    },
  };
});