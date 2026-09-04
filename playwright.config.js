import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Full matrix runs fine on CI's larger runners. In constrained local/dev
  // sandboxes, launching many Chromium instances at once can exhaust memory
  // and kill the whole run silently — capping workers trades speed for
  // reliability there. Override with PW_WORKERS if you have headroom.
  workers: process.env.CI ? undefined : (process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 2),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--disable-dev-shm-usage'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Boots the production build so tests run against exactly what ships,
  // not the dev server. `npm run build` must be run first (CI does this;
  // locally, run it once before `npm run test:layout` if dist/ is stale).
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
