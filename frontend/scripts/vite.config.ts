/**
 * Build config for the checks in this directory.
 *
 * They import the app's own modules rather than reimplementing them, which is
 * the entire point: a check that reimplements the thing it is checking will
 * agree with itself forever. Building them through Vite is what makes the real
 * modules importable outside the browser.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // These run under Node, not in a browser, so the app's browser target
    // would otherwise reject top-level await.
    target: 'node20',
    ssr: process.env.CHECK_ENTRY || 'scripts/renders.tsx',
    outDir: 'scripts/.out',
    emptyOutDir: false,
    minify: false,
  },
});
