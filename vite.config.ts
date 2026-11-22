import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app lives in web/ and runs entirely in the browser — no backend.
// `base: './'` keeps asset paths relative so it works under
// https://<user>.github.io/<repo>/ on GitHub Pages.
export default defineConfig({
  root: 'web',
  base: './',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['tests/**/*.test.ts'] },
} as never);
