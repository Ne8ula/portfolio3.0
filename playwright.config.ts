import { defineConfig, devices } from '@playwright/test'

import { resolveE2eTiming } from './scripts/e2e-policy'

const timing = resolveE2eTiming()

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
  // GitHub's software-rendered three.js scene can spend most of the original
  // 90s budget compiling the dev route and settling its first frames. Keep
  // local feedback tight, but give CI enough total test budget for the
  // existing bounded action/expect timeouts to complete.
  timeout: timing.test,
  expect: { timeout: timing.expect },
  fullyParallel: false,
  // `fullyParallel: false` serializes tests within a file, not across files.
  // Running the Phase 0 cockpit smoke and Phase 1 foundation files together
  // starts two software-WebGL scenes and has closed Chromium sessions on the
  // two-core GitHub runner. Keep CI deterministic; local runs may use the
  // default worker count.
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    // Continuous trace screencasts compete with SwiftShader on GitHub's
    // two-core runners. Keep the normal CI attempt representative and retain
    // full diagnostics on the first retry; local failures still retain traces.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
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
