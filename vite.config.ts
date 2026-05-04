import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'lab' ? '/ziip/' : '/',
  plugins: [preact(), tailwindcss()],
}));
