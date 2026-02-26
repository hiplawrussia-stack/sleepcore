/**
 * Breathing Page Object
 * =====================
 * Page Object for breathing exercise page with haptic feedback.
 *
 * IEC 62304 Compliance:
 * - Clinical feature verification per §5.7
 * - Traceability: CLI-001, CLI-002, CLI-003, CLI-004
 *
 * Note: Uses Playwright Clock API for timer testing.
 *
 * @module @sleepcore/mini-app/e2e
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Breathing phases
 */
export type BreathingPhase = 'idle' | 'inhale' | 'hold' | 'exhale' | 'hold2' | 'complete';

/**
 * Pattern info
 */
export interface PatternInfo {
  id: string;
  name: string;
  timing: string;
}

export class BreathingPage extends BasePage {
  // Locators
  readonly patternSelector: Locator;
  readonly patternButtons: Locator;
  readonly cycleSelector: Locator;
  readonly breathingCircle: Locator;
  readonly progressIndicator: Locator;
  readonly completionOverlay: Locator;

  constructor(page: Page) {
    super(page);

    // Pattern selector is a fieldset with legend "Выбери технику дыхания"
    this.patternSelector = page.locator('fieldset').filter({ hasText: 'Выбери технику дыхания' });
    // Pattern items are labels containing radio inputs and emoji icons
    this.patternButtons = page.locator('label').filter({ has: page.locator('.text-2xl') });
    // Cycle selector: fieldset containing cycle radio buttons
    this.cycleSelector = page.locator('fieldset').filter({ hasText: 'Количество циклов' });
    this.breathingCircle = page.locator('[class*="rounded-full"]').filter({ hasText: /вдох|выдох|задержка/i }).first();
    this.progressIndicator = page.locator('text=/Цикл \\d+ из \\d+/');
    this.completionOverlay = page.locator('text=Отлично!').locator('..');
  }

  async goto(patternId?: string): Promise<void> {
    const url = patternId ? `/breathing?pattern=${patternId}` : '/breathing';
    await this.page.goto(url);
    await this.waitForLoad();
    // Wait for React app to initialize and set up Telegram MainButton
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if pattern selector is visible
   */
  async isPatternSelectorVisible(): Promise<boolean> {
    return await this.isVisible(this.patternSelector);
  }

  /**
   * Get available patterns
   */
  async getAvailablePatterns(): Promise<PatternInfo[]> {
    const buttons = await this.patternButtons.all();
    const patterns: PatternInfo[] = [];

    for (const button of buttons) {
      const nameEl = button.locator('.font-medium');
      const timingEl = button.locator('.text-sm.text-night-400');

      const name = await nameEl.textContent() || '';
      const timing = await timingEl.textContent() || '';

      // Extract ID from selected state or data attribute
      const _isSelected = await button.evaluate(el =>
        el.className.includes('border-primary-500')
      );

      patterns.push({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name,
        timing,
      });
    }

    return patterns;
  }

  /**
   * Select a pattern by name
   */
  async selectPattern(patternName: string): Promise<void> {
    // Pattern items are label elements
    await this.page.locator(`label:has-text("${patternName}")`).click();
    await this.waitForAnimation();
  }

  /**
   * Get currently selected pattern name
   */
  async getSelectedPatternName(): Promise<string> {
    // Selected pattern label has border-primary-500 class
    const selectedLabel = this.page.locator('label.border-primary-500').filter({
      has: this.page.locator('.text-2xl'),
    }).first();

    return await selectedLabel.locator('.font-medium').textContent() || '';
  }

  /**
   * Select number of cycles
   */
  async selectCycles(cycles: 3 | 5 | 7 | 10): Promise<void> {
    // Cycles are label elements with radio inputs
    await this.cycleSelector.locator(`label:has-text("${cycles}")`).click();
    await this.waitForAnimation();
  }

  /**
   * Get estimated duration text
   */
  async getEstimatedDuration(): Promise<string> {
    const text = await this.cycleSelector.locator('.text-night-400.text-sm').textContent();
    return text || '';
  }

  /**
   * Start breathing exercise (via MainButton)
   */
  async startExercise(): Promise<void> {
    await this.expectMainButton('Начать');
    await this.clickMainButton();
    await this.waitForAnimation(300);
  }

  /**
   * Stop breathing exercise (via MainButton)
   */
  async stopExercise(): Promise<void> {
    await this.expectMainButton('Остановить');
    await this.clickMainButton();
    await this.waitForAnimation();
  }

  /**
   * Check if exercise is running
   */
  async isExerciseRunning(): Promise<boolean> {
    return await this.isVisible(this.progressIndicator);
  }

  /**
   * Get current cycle progress
   */
  async getCycleProgress(): Promise<{ current: number; total: number }> {
    const text = await this.progressIndicator.textContent() || '';
    const match = text.match(/Цикл (\d+) из (\d+)/);

    if (match) {
      return {
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10),
      };
    }

    return { current: 0, total: 0 };
  }

  /**
   * Install fake timers for exercise completion testing.
   * MUST be called BEFORE startExercise() for clock API to work.
   */
  async installClock(): Promise<void> {
    await this.page.clock.install({ time: Date.now() });
  }

  /**
   * Wait for exercise completion by advancing fake timers.
   * Uses smaller steps to ensure React can process state updates.
   * @param timeoutMs Maximum total time to fast-forward (default 5 minutes)
   */
  async waitForCompletionWithClock(timeoutMs = 300000): Promise<void> {
    // Use 1-second steps matching the timer's 100ms intervals
    const stepMs = 1000;
    let totalAdvanced = 0;

    while (!(await this.isVisible(this.completionOverlay, 50))) {
      // Advance time using fastForward which triggers setInterval callbacks
      await this.page.clock.fastForward(stepMs);
      // Give React time to process state updates in the real event loop
      await this.page.waitForTimeout(10);
      totalAdvanced += stepMs;

      if (totalAdvanced >= timeoutMs) {
        throw new Error(`Exercise did not complete after ${timeoutMs}ms of fast-forwarded time`);
      }
    }
  }

  /**
   * Wait for exercise completion (real-time, slow)
   * Use for specific real-time verification tests
   */
  async waitForCompletionRealTime(timeoutMs = 120000): Promise<void> {
    await this.completionOverlay.waitFor({ timeout: timeoutMs });
  }

  /**
   * Check if completion overlay is visible
   */
  async isCompleted(): Promise<boolean> {
    return await this.isVisible(this.completionOverlay);
  }

  /**
   * Close completion overlay (via MainButton "Готово")
   */
  async closeCompletion(): Promise<void> {
    await this.expectMainButton('Готово');
    await this.clickMainButton();
    await this.waitForAnimation();
  }

  /**
   * Get completion message
   */
  async getCompletionMessage(): Promise<string> {
    return await this.completionOverlay.textContent() || '';
  }

  /**
   * Run a complete breathing exercise flow with fast clock.
   * Installs clock API BEFORE page load, then fast-forwards to completion.
   */
  async runCompleteExercise(
    patternName?: string,
    cycles: 3 | 5 | 7 | 10 = 3
  ): Promise<void> {
    // Clock must be installed BEFORE page loads to intercept timers
    await this.page.clock.install({ time: Date.now() });

    // Now navigate (timers will be fake from the start)
    await this.goto();

    // Select pattern if specified
    if (patternName) {
      await this.selectPattern(patternName);
    }

    // Select cycles
    await this.selectCycles(cycles);

    // Start exercise (timers are fake)
    await this.startExercise();

    // Fast-forward to completion
    await this.waitForCompletionWithClock();

    // Verify completion
    expect(await this.isCompleted()).toBe(true);
  }
}
