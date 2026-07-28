import { defineConfig, devices } from '@playwright/test'

// Phase 0 browser harness (§8): Chromium only; Firefox/WebKit and the full
// geometry/accessibility matrix expand in Phase 8.
//
// The suite runs against a DEVELOPMENT server on purpose: the
// __COCKPIT_TEST_HOOKS__ bridge is compiled out of production builds
// (test-hooks.ts), so production bundles cannot — and must not — expose it.
// Phase 8's production gate builds for production and asserts the bridge is
// absent there.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
