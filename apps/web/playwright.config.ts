import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Cap local at 2 workers — the Next dev server lazy-compiles routes per
  // request and chokes when 4+ register flows hit it concurrently.
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
  },
  projects: [
    // Mobile + tablet only run viewport-sensitive specs under
    // `tests/e2e/responsive/`. Viewport-agnostic specs (forms, links, copy)
    // live directly under `tests/e2e/` and run on desktop-chromium only.
    {
      name: 'mobile-webkit',
      testMatch: /tests\/e2e\/responsive\/.*\.spec\.ts$/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'tablet',
      testMatch: /tests\/e2e\/responsive\/.*\.spec\.ts$/,
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'desktop-chromium',
      testMatch: /tests\/e2e\/.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts$/,
      fullyParallel: false,
      use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
