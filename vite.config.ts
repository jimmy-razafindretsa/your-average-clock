import { defineConfig } from 'vite';

// `base: './'` keeps the build portable: it runs from any sub-path (GitHub Pages, a USB stick, etc.)
export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
});
