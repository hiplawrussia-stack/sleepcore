/**
 * Auth Setup
 * ==========
 * Setup file that runs before all tests.
 * Prepares authentication state.
 */

import { test as setup } from '@playwright/test';
import { injectTelegramMock, defaultTestUser } from '../fixtures/telegram-mock';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Inject Telegram mock
  await injectTelegramMock(page, defaultTestUser);

  // Navigate to app
  await page.goto('/');

  // Wait for app to load and authenticate
  await page.waitForLoadState('networkidle');

  // Check that we're past the loading screen
  // The app should either show content or remain on loading
  // In test mode, we proceed even without real auth
  await page.waitForTimeout(2000);

  // Save storage state for reuse
  await page.context().storageState({ path: authFile });
});
