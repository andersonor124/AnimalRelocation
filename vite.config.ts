import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app lives in web/. In development, /api calls are proxied to
// `wrangler pages dev` (npm run dev:api), which runs the Hono API + local D1.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:8788' } },
  test: { root: '.', include: ['tests/**/*.test.ts'] },
} as never);
