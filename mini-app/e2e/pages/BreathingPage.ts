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

    this.patternSelector = page.locator('text=Выбери технику дыхания').locator('..');
    this.patternButtons = page.locator('button').filter({ has: page.locator('.text-2xl') });
    this.cycleSelector = page.locator('text=Количество циклов').locator('..');
    this.breathingCircle = page.locator('[class*="rounded-full"]').filter({ hasText: /вдох|выдох|задержка/i }).first();
    this.progressIndicator = page.locator('text=/Цикл \\d+ из \\d+/');
    this.completionOverlay = page.locator('text=Отлично!').locator('..');
  }

  async goto(patternId?: string): Promise<void> {
    const url = patternId ? `/breathing?pattern=${patternId}` : '/breathing';
    await this.page.goto(url);
    await this.waitForLoad();
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
    await this.page.locator(`button:has-text("${patternName}")`).click();
    await this.waitForAnimation();
  }

  /**
   * Get currently selected pattern name
   */
  async getSelectedPatternName(): Promise<string> {
    const selectedButton = this.patternButtons.filter({
      has: this.page.locator('.bg-primary-500'),
    }).first();

    return await selectedButton.locator('.font-medium').textContent() || '';
  }

  /**
   * Select number of cycles
   */
  async selectCycles(cycles: 3 | 5 | 7 | 10): Promise<void> {
    await this.cycleSelector.locator(`button:has-text("${cycles}")`).click();
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
   * Wait for exercise completion
   * Uses Clock API to fast-forward time in tests
   */
  async waitForCompletion(useFastClock = true): Promise<void> {
    if (useFastClock) {
      // Install fake timers
      await this.page.clock.install({ time: Date.now() });

      // Fast-forward until completion overlay appears
      while (!(await this.isVisible(this.completionOverlay, 100))) {
        await this.page.clock.fastForward(1000);
        await this.page.waitForTimeout(10); // Small real delay for React to update
      }
    } else {
      // Wait for real completion (slow, use for specific tests)
      await this.completionOverlay.waitFor({ timeout: 120000 });
    }
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
   * Run a complete breathing exercise flow
   * Uses Clock API for fast testing
   */
  async runCompleteExercise(
    patternName?: string,
    cycles: 3 | 5 | 7 | 10 = 3
  ): Promise<void> {
    // Select pattern if specified
    if (patternName) {
      await this.selectPattern(patternName);
    }

    // Select cycles
    await this.selectCycles(cycles);

    // Start exercise
    await this.startExercise();

    // Wait for completion
    await this.waitForCompletion();

    // Verify completion
    expect(await this.isCompleted()).toBe(true);
  }
}
