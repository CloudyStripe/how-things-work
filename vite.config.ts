import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Fixed ports so the dev server never lands on a port another local project holds
// (level-uap uses 3001/3002, and 5173 is Vite's default).
const DEV_PORT = 5180;
const PREVIEW_PORT = 5181;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  server: { port: DEV_PORT, strictPort: true },
  preview: { port: PREVIEW_PORT, strictPort: true },
  test: {
    passWithNoTests: true,
    projects: [
      {
        // The physics core runs in plain Node: if a physics test needs a DOM, the
        // core has picked up a rendering dependency it must not have.
        extends: true,
        test: {
          name: 'physics',
          include: ['src/physics/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}', 'content/**/*.test.ts'],
          exclude: ['src/physics/**'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
