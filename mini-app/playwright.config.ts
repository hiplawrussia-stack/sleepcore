/**
 * Playwright E2E Test Configuration
 * ==================================
 * Configuration for end-to-end testing of SleepCore Mini-App.
 *
 * IEC 62304 Compliance:
 * - System-level verification per §5.7
 * - Traceability to requirements (see verification matrix)
 *
 * @module @sleepcore/mini-app/e2e
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL for development server
 * In CI, this might be overridden by environment variable
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Safari/WebKit is only reliably available on macOS.
 * Skip Safari tests on Windows/Linux.
 */
const isMacOS = process.platform === 'darwin';

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',

  // Fail fast on first error in CI
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'e2e-results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    baseURL,

    // Collect trace when retrying failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Timeout for actions
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Test timeout (important for breathing exercises which involve timers)
  timeout: 60000,

  // Projects configuration - mobile-first approach
  // Note: Safari tests only run on macOS where WebKit is reliably available
  projects: [
    // Primary: Mobile Safari (iOS) - macOS only
    ...(isMacOS ? [{
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 14'],
        // Telegram Mini App viewport
        viewport: { width: 390, height: 844 },
      },
    }] : []),

    // Secondary: Mobile Chrome (Android)
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
      },
    },

    // Desktop Chrome for development
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 430, height: 932 }, // iPhone 14 Pro Max size
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
