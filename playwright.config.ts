import { defineConfig, devices } from '@playwright/test';

// Must match DEV_PORT in vite.config.ts.
const PORT = 5180;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Every worker renders WebGL in software, and the dev server serves three.js unbundled, so
  // too many at once starve each other: the 3D view can take several seconds to appear.
  workers: isCI ? undefined : 4,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      // v1 targets a desktop browser on a laptop, minimum 1280 x 720.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
  },
});
