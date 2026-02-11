/**
 * Home Page Object
 * ================
 * Page Object for the main landing page with breathing patterns.
 *
 * IEC 62304 Compliance:
 * - System verification per §5.7
 * - Traceability: UX-001, UX-002
 *
 * @module @sleepcore/mini-app/e2e
 */

import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Locators
  readonly greeting: Locator;
  readonly statsCards: Locator;
  readonly startBreathingCard: Locator;
  readonly sleepPatternsSection: Locator;
  readonly stressPatternsSection: Locator;
  readonly sonyaCard: Locator;

  constructor(page: Page) {
    super(page);

    this.greeting = page.locator('h1').first();
    this.statsCards = page.locator('.grid.grid-cols-2 > div');
    this.startBreathingCard = page.locator('text=Начать дыхание').locator('..');
    this.sleepPatternsSection = page.locator('text=Для сна').locator('..');
    this.stressPatternsSection = page.locator('text=От стресса').locator('..');
    this.sonyaCard = page.locator('text=Соня рада тебя видеть').locator('..');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  /**
   * Get greeting text
   */
  async getGreetingText(): Promise<string> {
    return await this.greeting.textContent() || '';
  }

  /**
   * Check if user name is in greeting
   */
  async expectGreetingContains(name: string): Promise<void> {
    const text = await this.getGreetingText();
    expect(text).toContain(name);
  }

  /**
   * Get stats values
   */
  async getStats(): Promise<{ sessions: number; streak: number }> {
    const cards = await this.statsCards.all();
    if (cards.length < 2) {
      return { sessions: 0, streak: 0 };
    }

    const sessionsText = await cards[0].locator('.text-3xl').textContent();
    const streakText = await cards[1].locator('.text-3xl').textContent();

    return {
      sessions: parseInt(sessionsText || '0', 10),
      streak: parseInt(streakText || '0', 10),
    };
  }

  /**
   * Click "Start Breathing" card
   */
  async clickStartBreathing(): Promise<void> {
    await this.startBreathingCard.click();
    await this.waitForLoad();
  }

  /**
   * Get pattern cards in sleep section
   */
  async getSleepPatterns(): Promise<string[]> {
    const cards = await this.sleepPatternsSection.locator('button, [role="button"]').all();
    const names: string[] = [];

    for (const card of cards) {
      const name = await card.locator('.font-medium').textContent();
      if (name) names.push(name);
    }

    return names;
  }

  /**
   * Click a specific pattern by name
   */
  async clickPattern(patternName: string): Promise<void> {
    await this.page.locator(`text=${patternName}`).first().click();
    await this.waitForLoad();
  }

  /**
   * Check if Sonya card is visible
   */
  async isSonyaVisible(): Promise<boolean> {
    return await this.isVisible(this.sonyaCard);
  }

  /**
   * Get Sonya's evolution stage
   */
  async getSonyaStage(): Promise<string> {
    const text = await this.sonyaCard.textContent() || '';

    if (text.includes('Мудрая сова')) return 'wise_owl';
    if (text.includes('Молодая сова')) return 'young_owl';
    return 'owlet';
  }
}
