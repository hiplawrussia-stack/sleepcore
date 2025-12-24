/**
 * Playwright Configuration
 * ========================
 * E2E testing configuration for SleepCore Mini App + API.
 */

import { defineConfig, devices } from '@playwright/test';

// Read environment variables
const API_URL = process.env.API_URL || 'http://localhost:3001';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for Mini App
    baseURL: APP_URL,

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Timeout for actions
    actionTimeout: 10000,

    // Custom headers for API testing
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // Global timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Configure projects for major browsers
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Desktop Chrome (primary)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
    },

    // Desktop Safari
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome (Android simulation)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
      dependencies: ['setup'],
    },

    // Mobile Safari (iOS simulation)
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
      },
      dependencies: ['setup'],
    },
  ],

  // Run local dev servers before starting the tests
  webServer: [
    // API Server
    {
      command: 'npm run dev',
      cwd: '../api',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        PORT: '3001',
        DATABASE_PATH: ':memory:',
        JWT_SECRET: 'test-secret-key-for-e2e',
        BOT_TOKEN: 'test:bot:token',
      },
    },
    // Mini App Dev Server
    {
      command: 'npm run dev',
      cwd: '../mini-app',
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
});
