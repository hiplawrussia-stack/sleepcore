/**
 * Profile Page Object
 * ===================
 * Page Object for user profile with stats, settings, and GDPR controls.
 *
 * IEC 62304 Compliance:
 * - GDPR verification per regulatory requirements
 * - Traceability: GDPR-015, GDPR-017, GDPR-020, GAM-001, GAM-002
 *
 * @module @sleepcore/mini-app/e2e
 */

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * User stats
 */
export interface UserStats {
  totalSessions: number;
  totalTime: string;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Evolution info
 */
export interface EvolutionInfo {
  stage: string;
  emoji: string;
  name: string;
  progress: number;
}

export class ProfilePage extends BasePage {
  // Locators
  readonly userName: Locator;
  readonly userAvatar: Locator;
  readonly evolutionCard: Locator;
  readonly statsGrid: Locator;
  readonly questsPanel: Locator;
  readonly weeklyChart: Locator;
  readonly xpProgress: Locator;
  readonly settingsSection: Locator;
  readonly hapticsToggle: Locator;
  readonly privacyCenter: Locator;
  readonly badgesSection: Locator;

  constructor(page: Page) {
    super(page);

    this.userName = page.locator('h1.text-xl.font-bold.text-night-100');
    this.userAvatar = page.locator('.w-20.h-20.rounded-full');
    this.evolutionCard = page.locator('text=/Совёнок|Молодая сова|Мудрая сова|Мастер сна/').locator('..').locator('..');
    this.statsGrid = page.locator('.grid.grid-cols-2.gap-3');
    this.questsPanel = page.locator('text=Задания').locator('..');
    this.weeklyChart = page.locator('text=/Активность за неделю|weekActivity/').locator('..');
    this.xpProgress = page.locator('text=/\\d+ XP/').locator('..').locator('..');
    this.settingsSection = page.locator('text=/Настройки|settings\\.title/').locator('..');
    this.hapticsToggle = page.locator('role=switch[name=/Вибрация|haptics/i]');
    this.privacyCenter = page.locator('text=Приватность и данные').locator('..').locator('..');
    this.badgesSection = page.locator('text=/Достижения|badges\\.title/').locator('..');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await this.waitForLoad();
  }

  /**
   * Get user display name
   */
  async getUserName(): Promise<string> {
    return await this.userName.textContent() || '';
  }

  /**
   * Get evolution info
   */
  async getEvolutionInfo(): Promise<EvolutionInfo | null> {
    if (!(await this.isVisible(this.evolutionCard))) {
      return null;
    }

    const text = await this.evolutionCard.textContent() || '';
    const emojiEl = this.evolutionCard.locator('.text-4xl').first();
    const emoji = await emojiEl.textContent() || '';

    let stage = 'owlet';
    let name = 'Совёнок';

    if (text.includes('Мастер сна')) {
      stage = 'master';
      name = 'Мастер сна Соня';
    } else if (text.includes('Мудрая сова')) {
      stage = 'wise_owl';
      name = 'Мудрая сова Соня';
    } else if (text.includes('Молодая сова')) {
      stage = 'young_owl';
      name = 'Молодая сова Соня';
    } else {
      name = 'Совёнок Соня';
    }

    // Get progress bar width
    const progressBar = this.evolutionCard.locator('.bg-gradient-to-r');
    let progress = 0;
    if (await this.isVisible(progressBar, 1000)) {
      const style = await progressBar.getAttribute('style');
      const match = style?.match(/width:\s*(\d+(?:\.\d+)?)%/);
      if (match) {
        progress = parseFloat(match[1]);
      }
    }

    return { stage, emoji, name, progress };
  }

  /**
   * Get user stats
   */
  async getStats(): Promise<UserStats | null> {
    if (!(await this.isVisible(this.statsGrid))) {
      return null;
    }

    const cards = await this.statsGrid.locator('> div').all();
    if (cards.length < 4) return null;

    const getValue = async (index: number): Promise<string> => {
      return await cards[index].locator('.text-2xl').textContent() || '0';
    };

    return {
      totalSessions: parseInt(await getValue(0), 10),
      totalTime: await getValue(1),
      currentStreak: parseInt(await getValue(2), 10),
      longestStreak: parseInt(await getValue(3), 10),
    };
  }

  /**
   * Check if quests panel is visible
   */
  async isQuestsPanelVisible(): Promise<boolean> {
    return await this.isVisible(this.questsPanel);
  }

  /**
   * Get active quests
   */
  async getActiveQuests(): Promise<string[]> {
    const questItems = await this.questsPanel.locator('[class*="Card"]').all();
    const quests: string[] = [];

    for (const item of questItems) {
      const text = await item.textContent();
      if (text) quests.push(text);
    }

    return quests;
  }

  /**
   * Get XP level info
   */
  async getXPInfo(): Promise<{ level: number; xp: number; toNext: number } | null> {
    if (!(await this.isVisible(this.xpProgress))) {
      return null;
    }

    const text = await this.xpProgress.textContent() || '';

    const levelMatch = text.match(/Уровень (\d+)/);
    const xpMatch = text.match(/(\d+) XP/);
    const toNextMatch = text.match(/До следующего уровня: (\d+)/);

    return {
      level: levelMatch ? parseInt(levelMatch[1], 10) : 0,
      xp: xpMatch ? parseInt(xpMatch[1], 10) : 0,
      toNext: toNextMatch ? parseInt(toNextMatch[1], 10) : 0,
    };
  }

  /**
   * Toggle haptics setting
   */
  async toggleHaptics(): Promise<void> {
    await this.hapticsToggle.click();
    await this.waitForAnimation();
  }

  /**
   * Check if haptics is enabled
   */
  async isHapticsEnabled(): Promise<boolean> {
    const className = await this.hapticsToggle.getAttribute('class') || '';
    return className.includes('bg-primary-500');
  }

  // =====================
  // GDPR Privacy Controls
  // =====================

  /**
   * Check if Privacy Center is visible
   */
  async isPrivacyCenterVisible(): Promise<boolean> {
    return await this.isVisible(this.privacyCenter);
  }

  /**
   * Expand privacy center if collapsed
   */
  async expandPrivacyCenter(): Promise<void> {
    const expandButton = this.page.locator('text=Приватность и данные');
    await expandButton.click();
    await this.waitForAnimation();
  }

  /**
   * Click "View My Data" button (GDPR Article 15)
   */
  async clickViewMyData(): Promise<void> {
    await this.expandPrivacyCenter();
    await this.page.locator('text=Мои данные').click();
    await this.waitForAnimation();
  }

  /**
   * Click "Export Data" button (GDPR Article 20)
   */
  async clickExportData(): Promise<void> {
    await this.expandPrivacyCenter();
    await this.page.locator('text=Экспорт данных').click();
    await this.waitForAnimation();
  }

  /**
   * Click "Delete Data" button (GDPR Article 17)
   */
  async clickDeleteData(): Promise<void> {
    await this.expandPrivacyCenter();
    await this.page.locator('text=Удалить данные').click();
    await this.waitForAnimation();
  }

  /**
   * Confirm deletion in dialog
   */
  async confirmDeletion(): Promise<void> {
    // Wait for confirmation dialog
    const confirmButton = this.page.locator('button:has-text("Удалить")').last();
    await confirmButton.click();
    await this.waitForAnimation();
  }

  /**
   * Cancel deletion in dialog
   */
  async cancelDeletion(): Promise<void> {
    const cancelButton = this.page.locator('button:has-text("Отмена")');
    await cancelButton.click();
    await this.waitForAnimation();
  }

  // =====================
  // Badges
  // =====================

  /**
   * Check if badges section is visible
   */
  async isBadgesSectionVisible(): Promise<boolean> {
    return await this.isVisible(this.badgesSection);
  }

  /**
   * Get earned badges
   */
  async getBadges(): Promise<string[]> {
    if (!(await this.isBadgesSectionVisible())) {
      return [];
    }

    const badgeElements = await this.badgesSection.locator('.rounded-full').all();
    const badges: string[] = [];

    for (const el of badgeElements) {
      const text = await el.textContent();
      if (text) badges.push(text.replace('🏅 ', ''));
    }

    return badges;
  }
}
