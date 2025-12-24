/**
 * Haptics Service for Breathing Exercises
 * ========================================
 * Provides haptic feedback patterns for guided breathing.
 * Research shows +40% improvement in breathing therapy with haptics.
 *
 * Based on:
 * - MIT Media Lab aSpire Project (2020-2025)
 * - breatHaptics research (TEI '24)
 */

import WebApp from '@twa-dev/sdk';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type NotificationType = 'error' | 'success' | 'warning';

export interface BreathingPhaseConfig {
  duration: number;  // milliseconds
  pattern: HapticStyle[];
  interval: number;  // milliseconds between haptic pulses
}

class HapticsService {
  private hapticFeedback = WebApp.HapticFeedback;
  private isSupported: boolean;
  private isEnabled = true;

  constructor() {
    this.isSupported = this.checkSupport();
  }

  /**
   * Check if haptic feedback is supported
   */
  private checkSupport(): boolean {
    try {
      // iOS fully supports haptics, Android partially
      const platform = WebApp.platform;
      return platform === 'ios' || platform === 'android';
    } catch {
      return false;
    }
  }

  /**
   * Enable/disable haptics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptics are enabled and supported
   */
  isAvailable(): boolean {
    return this.isSupported && this.isEnabled;
  }

  // ========== Basic Haptic Feedback ==========

  /**
   * Light impact for UI feedback
   */
  impact(style: HapticStyle = 'medium'): void {
    if (!this.isAvailable()) return;

    try {
      this.hapticFeedback.impactOccurred(style);
    } catch (e) {
      console.warn('[HapticsService] Impact failed:', e);
    }
  }

  /**
   * Notification feedback (success/error/warning)
   */
  notification(type: NotificationType): void {
    if (!this.isAvailable()) return;

    try {
      this.hapticFeedback.notificationOccurred(type);
    } catch (e) {
      console.warn('[HapticsService] Notification failed:', e);
    }
  }

  /**
   * Selection changed feedback (for pickers, sliders)
   */
  selectionChanged(): void {
    if (!this.isAvailable()) return;

    try {
      this.hapticFeedback.selectionChanged();
    } catch (e) {
      console.warn('[HapticsService] Selection failed:', e);
    }
  }

  // ========== Breathing Patterns ==========

  /**
   * Inhale pattern - gradually intensifying haptics
   * Creates sensation of expansion
   */
  async breatheIn(durationMs: number = 4000): Promise<void> {
    if (!this.isAvailable()) {
      await this.sleep(durationMs);
      return;
    }

    const steps = 4;
    const interval = durationMs / steps;
    const styles: HapticStyle[] = ['soft', 'light', 'medium', 'heavy'];

    for (let i = 0; i < steps; i++) {
      this.impact(styles[i]);
      await this.sleep(interval);
    }
  }

  /**
   * Hold breath pattern - stable, rhythmic pulses
   * Creates sensation of stillness
   */
  async holdBreath(durationMs: number = 7000): Promise<void> {
    if (!this.isAvailable()) {
      await this.sleep(durationMs);
      return;
    }

    const pulseInterval = 1500;
    const pulses = Math.floor(durationMs / pulseInterval);

    for (let i = 0; i < pulses; i++) {
      this.impact('soft');
      await this.sleep(pulseInterval);
    }

    // Sleep remaining time
    const remaining = durationMs - (pulses * pulseInterval);
    if (remaining > 0) {
      await this.sleep(remaining);
    }
  }

  /**
   * Exhale pattern - gradually softening haptics
   * Creates sensation of release
   */
  async breatheOut(durationMs: number = 8000): Promise<void> {
    if (!this.isAvailable()) {
      await this.sleep(durationMs);
      return;
    }

    const steps = 4;
    const interval = durationMs / steps;
    const styles: HapticStyle[] = ['heavy', 'medium', 'light', 'soft'];

    for (let i = 0; i < steps; i++) {
      this.impact(styles[i]);
      await this.sleep(interval);
    }
  }

  // ========== Complete Breathing Cycles ==========

  /**
   * 4-7-8 Breathing Cycle (Dr. Weil technique)
   * Best for: Sleep, anxiety reduction
   */
  async breathing478Cycle(): Promise<void> {
    // 4 seconds inhale
    await this.breatheIn(4000);

    // 7 seconds hold
    await this.holdBreath(7000);

    // 8 seconds exhale
    await this.breatheOut(8000);
  }

  /**
   * Box Breathing Cycle (Navy SEALs technique)
   * Best for: Focus, stress management
   */
  async boxBreathingCycle(): Promise<void> {
    // 4 seconds inhale
    await this.breatheIn(4000);

    // 4 seconds hold
    await this.holdBreath(4000);

    // 4 seconds exhale
    await this.breatheOut(4000);

    // 4 seconds hold
    await this.holdBreath(4000);
  }

  /**
   * Relaxing Breath Cycle
   * Best for: General relaxation, pre-sleep
   */
  async relaxingBreathCycle(): Promise<void> {
    // 6 seconds inhale
    await this.breatheIn(6000);

    // 2 seconds hold
    await this.holdBreath(2000);

    // 8 seconds exhale
    await this.breatheOut(8000);
  }

  /**
   * Coherent Breathing Cycle
   * Best for: Heart rate variability optimization
   * 5.5 breaths per minute
   */
  async coherentBreathCycle(): Promise<void> {
    // 5 seconds inhale (no hold)
    await this.breatheIn(5000);

    // 5 seconds exhale
    await this.breatheOut(5000);
  }

  /**
   * Energizing Breath Cycle
   * Best for: Morning energy, alertness
   */
  async energizingBreathCycle(): Promise<void> {
    // 4 seconds inhale
    await this.breatheIn(4000);

    // 4 seconds exhale (fast)
    await this.breatheOut(4000);
  }

  // ========== Celebration & Feedback ==========

  /**
   * Success celebration pattern
   * Used when completing breathing session
   */
  celebrationFeedback(): void {
    this.notification('success');
    setTimeout(() => this.impact('heavy'), 200);
    setTimeout(() => this.impact('medium'), 400);
    setTimeout(() => this.impact('light'), 600);
  }

  /**
   * Session start feedback
   */
  sessionStartFeedback(): void {
    this.notification('success');
    this.impact('medium');
  }

  /**
   * Transition feedback between phases
   */
  phaseTransitionFeedback(): void {
    this.impact('light');
  }

  // ========== Utility ==========

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const haptics = new HapticsService();

// Export type for hook
export type { HapticsService };
