/**
 * Sleep Stats Page Object
 * =======================
 * Page Object for sleep statistics visualization from wearables.
 *
 * IEC 62304 Compliance:
 * - System verification per §5.7
 * - Traceability: DATA-001, WEAR-001
 *
 * @module @sleepcore/mini-app/e2e
 */

import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Sleep metrics data structure
 */
export interface SleepMetrics {
  avgTst: string | null;
  avgSe: string | null;
  sol: string | null;
  waso: string | null;
  awakenings: string | null;
  hrv: string | null;
  spo2: string | null;
}

/**
 * Sleep stage percentages
 */
export interface SleepStages {
  deep: string | null;
  rem: string | null;
  light: string | null;
}

/**
 * Sleep session row data
 */
export interface SessionRowData {
  dayName: string;
  date: string;
  tst: string;
  se: string;
}

export class SleepPage extends BasePage {
  // Locators
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly metricCards: Locator;
  readonly sleepStagesCard: Locator;
  readonly biometricsSection: Locator;
  readonly historySection: Locator;
  readonly sessionRows: Locator;
  readonly emptyState: Locator;
  readonly lastSyncInfo: Locator;
  readonly loadingSkeleton: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.locator('h1').first();
    this.subtitle = page.locator('h1 + p');
    this.metricCards = page.locator('[class*="grid-cols-2"] > div').first().locator('..');
    this.sleepStagesCard = page.locator('text=Фазы сна').locator('..').locator('..');
    this.biometricsSection = page.locator('text=💓').locator('..').locator('..');
    this.historySection = page.locator('text=История').locator('..');
    this.sessionRows = page.locator('[aria-label*="сна за"]');
    this.emptyState = page.locator('text=Нет данных о сне').locator('..');
    this.lastSyncInfo = page.locator('text=Синхронизировано в');
    this.loadingSkeleton = page.locator('.animate-pulse').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/sleep');
    await this.waitForLoad();
  }

  /**
   * Check if page is showing loading state
   */
  async isLoading(): Promise<boolean> {
    return await this.isVisible(this.loadingSkeleton, 1000);
  }

  /**
   * Check if page shows empty state
   */
  async isEmptyState(): Promise<boolean> {
    return await this.isVisible(this.emptyState);
  }

  /**
   * Check if page has data displayed
   */
  async hasData(): Promise<boolean> {
    // Check for metric cards presence
    const tstCard = this.page.locator('text=Среднее время сна');
    return await this.isVisible(tstCard);
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.title.textContent() || '';
  }

  /**
   * Get subtitle (days info)
   */
  async getSubtitle(): Promise<string> {
    return await this.subtitle.textContent() || '';
  }

  /**
   * Get average sleep time metric
   */
  async getAvgSleepTime(): Promise<string | null> {
    const card = this.page.locator('text=Среднее время сна').locator('..');
    const value = card.locator('.text-xl, .text-lg').first();
    return await value.textContent();
  }

  /**
   * Get sleep efficiency metric
   */
  async getSleepEfficiency(): Promise<string | null> {
    const card = this.page.locator('text=Эффективность сна').locator('..');
    const value = card.locator('.text-xl, .text-lg').first();
    return await value.textContent();
  }

  /**
   * Check if sleep stages bar is visible
   */
  async hasSleepStages(): Promise<boolean> {
    return await this.isVisible(this.sleepStagesCard);
  }

  /**
   * Get sleep stage percentages
   */
  async getSleepStages(): Promise<SleepStages> {
    const container = this.sleepStagesCard;

    const getStageValue = async (label: string): Promise<string | null> => {
      const row = container.locator(`text=${label}`).locator('..');
      const value = row.locator('.text-night-200');
      return await value.textContent();
    };

    return {
      deep: await getStageValue('Глубокий'),
      rem: await getStageValue('REM'),
      light: await getStageValue('Лёгкий'),
    };
  }

  /**
   * Check if HRV metric is displayed
   */
  async hasHrvMetric(): Promise<boolean> {
    const hrv = this.page.locator('text=Вариаб. ритма');
    return await this.isVisible(hrv);
  }

  /**
   * Get HRV value
   */
  async getHrvValue(): Promise<string | null> {
    const card = this.page.locator('text=💓').locator('..').locator('..');
    const value = card.locator('.text-xl').first();
    return await value.textContent();
  }

  /**
   * Check if SpO2 metric is displayed
   */
  async hasSpo2Metric(): Promise<boolean> {
    const spo2 = this.page.locator('text=Насыщение O₂');
    return await this.isVisible(spo2);
  }

  /**
   * Get SpO2 value
   */
  async getSpo2Value(): Promise<string | null> {
    const card = this.page.locator('text=Насыщение O₂').locator('..');
    const value = card.locator('.text-xl').first();
    return await value.textContent();
  }

  /**
   * Get number of session rows in history
   */
  async getSessionCount(): Promise<number> {
    const sessions = await this.sessionRows.all();
    return sessions.length;
  }

  /**
   * Get session row data by index
   */
  async getSessionData(index: number): Promise<SessionRowData | null> {
    const sessions = await this.sessionRows.all();
    if (index >= sessions.length) return null;

    const row = sessions[index];
    const dayName = await row.locator('.text-xs.text-night-400').first().textContent() || '';
    const date = await row.locator('.text-sm.font-medium').first().textContent() || '';
    const tst = await row.locator('.font-medium.text-night-100').first().textContent() || '';
    const seText = await row.locator('text=SE').first().textContent() || '';

    return {
      dayName: dayName.trim(),
      date: date.trim(),
      tst: tst.trim(),
      se: seText.replace('SE ', '').trim(),
    };
  }

  /**
   * Check if trend indicator is visible
   */
  async hasTrendIndicator(): Promise<boolean> {
    const trends = this.page.locator('text=/[↑→↓]/');
    return await this.isVisible(trends);
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    if (!await this.isVisible(this.lastSyncInfo)) return null;
    return await this.lastSyncInfo.textContent();
  }

  /**
   * Navigate back using back button
   */
  async goBack(): Promise<void> {
    await this.clickBackButton();
    await this.waitForLoad();
  }

  /**
   * Click on a session row
   */
  async clickSession(index: number): Promise<void> {
    const sessions = await this.sessionRows.all();
    if (index < sessions.length) {
      await sessions[index].click();
    }
  }
}
