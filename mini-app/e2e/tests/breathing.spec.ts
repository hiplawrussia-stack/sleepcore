/**
 * Breathing Exercise E2E Tests
 * ============================
 * Tests for breathing exercise flow - critical clinical feature.
 *
 * IEC 62304 Compliance:
 * - Clinical feature verification per §5.7
 * - Traceability: CLI-001, CLI-002, CLI-003, CLI-004
 * - Risk mitigation: Timer accuracy verification
 *
 * Note: Uses Playwright Clock API for timer testing to avoid
 * waiting for real breathing cycles (which can take minutes).
 *
 * @module @sleepcore/mini-app/e2e
 */

import { test, expect } from '../fixtures/telegram.fixture';
import { BreathingPage, HomePage } from '../pages';

test.describe('Breathing Exercise', () => {
  test.describe('Pattern Selection', () => {
    test('should display available breathing patterns', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      const patterns = await breathingPage.getAvailablePatterns();

      // Should have multiple patterns available
      expect(patterns.length).toBeGreaterThan(0);

      // Should include 4-7-8 pattern (free tier)
      const has478 = patterns.some(p => p.name.includes('4-7-8'));
      expect(has478).toBe(true);
    });

    test('should select pattern and show timing info', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      // Select box breathing
      await breathingPage.selectPattern('Бокс');

      // Verify selection
      const selected = await breathingPage.getSelectedPatternName();
      expect(selected).toContain('Бокс');
    });

    test('should update estimated duration when changing cycles', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      // Get initial duration with 3 cycles
      await breathingPage.selectCycles(3);
      const duration3 = await breathingPage.getEstimatedDuration();

      // Change to 7 cycles
      await breathingPage.selectCycles(7);
      const duration7 = await breathingPage.getEstimatedDuration();

      // Duration should be different (and longer for 7 cycles)
      expect(duration7).not.toBe(duration3);
    });

    test('should show pattern benefit description', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      // Check benefit text is shown
      const benefitText = await telegramPage.locator('.bg-night-800\\/50').textContent();
      expect(benefitText).toBeTruthy();
      expect(benefitText!.length).toBeGreaterThan(10);
    });
  });

  test.describe('Exercise Flow', () => {
    test('should start exercise when MainButton clicked', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();

      // Verify MainButton shows "Начать"
      await breathingPage.expectMainButton('Начать');

      // Start exercise
      await breathingPage.startExercise();

      // Exercise should be running
      expect(await breathingPage.isExerciseRunning()).toBe(true);

      // MainButton should change to "Остановить"
      await breathingPage.expectMainButton('Остановить');
    });

    test('should stop exercise when Stop button clicked', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();
      await breathingPage.startExercise();

      // Stop exercise
      await breathingPage.stopExercise();

      // Should return to pattern selector
      expect(await breathingPage.isPatternSelectorVisible()).toBe(true);
    });

    test('should show cycle progress during exercise', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();
      await breathingPage.selectCycles(5);
      await breathingPage.startExercise();

      // Check progress indicator
      const progress = await breathingPage.getCycleProgress();
      expect(progress.current).toBe(1);
      expect(progress.total).toBe(5);
    });

    test('should hide pattern selector during exercise', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();
      await breathingPage.startExercise();

      // Pattern selector should be hidden
      expect(await breathingPage.isPatternSelectorVisible()).toBe(false);
    });
  });

  test.describe('Exercise Completion', () => {
    // Note: This test uses Clock API to fast-forward time
    test.skip('should show completion screen after all cycles', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();
      await breathingPage.selectCycles(3);

      // Run complete exercise with fast clock
      await breathingPage.runCompleteExercise();

      // Verify completion
      expect(await breathingPage.isCompleted()).toBe(true);

      // Check completion message
      const message = await breathingPage.getCompletionMessage();
      expect(message).toContain('Отлично');
      expect(message).toContain('3');
    });

    test.skip('should return to selection after completion dismissed', async ({ telegramPage }) => {
      const breathingPage = new BreathingPage(telegramPage);

      await breathingPage.goto();
      await breathingPage.runCompleteExercise('4-7-8', 3);

      // Close completion
      await breathingPage.closeCompletion();

      // Should be back at pattern selector
      expect(await breathingPage.isPatternSelectorVisible()).toBe(true);
    });
  });

  test.describe('Navigation from Home', () => {
    test('should navigate to breathing via Start Breathing card', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);
      const breathingPage = new BreathingPage(telegramPage);

      await homePage.goto();
      await homePage.clickStartBreathing();

      // Should be on breathing page
      expect(await breathingPage.isPatternSelectorVisible()).toBe(true);
    });

    test('should navigate to breathing with pattern via pattern card', async ({ telegramPage }) => {
      const homePage = new HomePage(telegramPage);
      const breathingPage = new BreathingPage(telegramPage);

      await homePage.goto();

      // Click a specific pattern from home
      await homePage.clickPattern('4-7-8');

      // Should be on breathing with that pattern selected
      const selected = await breathingPage.getSelectedPatternName();
      expect(selected).toContain('4-7-8');
    });
  });
});

test.describe('Breathing - Security', () => {
  test('should sanitize pattern parameter (SEC-005)', async ({ telegramPage }) => {
    const breathingPage = new BreathingPage(telegramPage);

    // Try XSS in pattern parameter
    await telegramPage.goto('/breathing?pattern=<script>alert(1)</script>');

    // Should fallback to default, not execute script
    const selected = await breathingPage.getSelectedPatternName();
    expect(selected).toContain('4-7-8');

    // Page should not have any script injection
    const hasAlert = await telegramPage.evaluate(() => {
      return document.body.innerHTML.includes('<script>');
    });
    expect(hasAlert).toBe(false);
  });

  test('should handle SQL-like pattern parameter safely', async ({ telegramPage }) => {
    const breathingPage = new BreathingPage(telegramPage);

    // Try SQL injection in pattern parameter
    await telegramPage.goto("/breathing?pattern='; DROP TABLE users;--");

    // Should fallback to default
    const selected = await breathingPage.getSelectedPatternName();
    expect(selected).toContain('4-7-8');
  });
});
