/**
 * Base Page Object
 * ================
 * Abstract base class for all Page Objects with common functionality.
 *
 * IEC 62304 Compliance:
 * - Standardized test interface per §5.7
 * - Code reuse for verification activities
 *
 * @module @sleepcore/mini-app/e2e
 */

import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Main button state from Telegram mock
 */
interface MainButtonState {
  text: string;
  visible: boolean;
}

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to this page's URL
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get the bottom navigation
   */
  get bottomNav(): Locator {
    return this.page.locator('nav.fixed.bottom-0');
  }

  /**
   * Navigate using bottom navigation
   */
  async navigateTo(path: 'home' | 'breathing' | 'profile'): Promise<void> {
    const paths = {
      home: '/',
      breathing: '/breathing',
      profile: '/profile',
    };

    await this.bottomNav.locator(`a[href="${paths[path]}"]`).click();
    await this.waitForLoad();
  }

  /**
   * Click Telegram MainButton (via mock helper)
   */
  async clickMainButton(): Promise<void> {
    console.log('[BasePage] clickMainButton called');
    await this.page.evaluate(() => {
      console.log('[E2E] clickMainButton evaluate start');
      const fn = (window as unknown as { __e2e_clickMainButton?: () => void }).__e2e_clickMainButton;
      if (!fn) {
        console.error('[E2E] __e2e_clickMainButton function not found!');
        return;
      }
      console.log('[E2E] calling __e2e_clickMainButton');
      fn();
    });
  }

  /**
   * Click Telegram BackButton (via mock helper)
   */
  async clickBackButton(): Promise<void> {
    await this.page.evaluate(() => {
      (window as unknown as { __e2e_clickBackButton: () => void }).__e2e_clickBackButton();
    });
  }

  /**
   * Get MainButton state
   */
  async getMainButtonState(): Promise<MainButtonState> {
    return await this.page.evaluate(() => {
      return (window as unknown as { __e2e_getMainButtonState: () => MainButtonState }).__e2e_getMainButtonState();
    });
  }

  /**
   * Assert MainButton has specific text.
   * Waits for the button to become visible with the expected text.
   */
  async expectMainButton(text: string, timeout = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = await this.getMainButtonState();
      if (state.visible && state.text === text) {
        return;
      }
      await this.page.waitForTimeout(100);
    }

    // Final check with proper assertion
    const state = await this.getMainButtonState();
    expect(state.visible).toBe(true);
    expect(state.text).toBe(text);
  }

  /**
   * Take a screenshot with timestamp
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for animation to complete (framer-motion uses CSS transitions)
   */
  async waitForAnimation(timeout = 500): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Check if element is visible with retry
   */
  async isVisible(locator: Locator, timeout = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }
}
