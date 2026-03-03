/**
 * Audio Service for Breathing Exercises
 * ======================================
 * Web Audio API based sound generation for guided breathing.
 * Synchronized with haptic feedback for multi-sensory experience.
 *
 * Research basis:
 * - Audio-haptic combination is "significantly the easiest to follow" (PubMed 2021)
 * - Audio cues show higher perceived calm than visual-only (Frontiers 2022)
 * - Simple tones are effective; specific frequency is not critical
 *
 * Technical approach:
 * - Synthesized sine wave tones (0 KB bundle impact)
 * - Frequency sweep for inhale/exhale phases
 * - Single AudioContext per MDN best practices
 * - User gesture required (Telegram WebApp compliant)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
 * @module @sleepcore/mini-app/services
 */

export type ToneType = 'sine' | 'triangle';

export interface AudioPreferences {
  enabled: boolean;
  volume: number; // 0-1, WCAG compliance
  toneType: ToneType;
  baseFrequency: 220 | 432; // A3 standard or "relaxation" 432Hz
}

const DEFAULT_PREFERENCES: AudioPreferences = {
  enabled: true,
  volume: 0.3, // Gentle default
  toneType: 'sine',
  baseFrequency: 220,
};

class AudioService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private currentGain: GainNode | null = null;
  private preferences: AudioPreferences = DEFAULT_PREFERENCES;
  private isEnabled = true;
  private abortController: AbortController | null = null;

  /**
   * Initialize AudioContext on user gesture
   * Must be called from click/touch event handler
   */
  init(): boolean {
    if (this.audioContext) {
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      return true;
    }

    try {
      // Create single AudioContext (MDN best practice)
      this.audioContext = new (window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();

      // Master gain for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.preferences.volume;
      this.masterGain.connect(this.audioContext.destination);

      console.log('[AudioService] Initialized successfully');
      return true;
    } catch (e) {
      console.warn('[AudioService] Failed to initialize:', e);
      return false;
    }
  }

  /**
   * Check if audio is available and enabled
   */
  isAvailable(): boolean {
    return this.isEnabled && this.audioContext !== null;
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.preferences.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.preferences.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.preferences.volume;
  }

  /**
   * Set preferences
   */
  setPreferences(prefs: Partial<AudioPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    if (prefs.volume !== undefined) {
      this.setVolume(prefs.volume);
    }
    if (prefs.enabled !== undefined) {
      this.setEnabled(prefs.enabled);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): AudioPreferences {
    return { ...this.preferences };
  }

  /**
   * Abort any running audio pattern
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.stop();
  }

  /**
   * Stop current sound immediately
   */
  stop(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop();
      } catch {
        // Already stopped
      }
      this.currentOscillator.disconnect();
      this.currentOscillator = null;
    }
    if (this.currentGain) {
      this.currentGain.disconnect();
      this.currentGain = null;
    }
  }

  /**
   * Create abort controller for breathing session
   */
  private createAbortController(): AbortController {
    this.abort();
    this.abortController = new AbortController();
    return this.abortController;
  }

  /**
   * Check if operation is aborted
   */
  private isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  // ========== Breathing Phase Sounds ==========

  /**
   * Inhale sound - frequency rises smoothly
   * Creates sensation of expansion/rising
   */
  async breatheIn(durationMs: number = 4000): Promise<void> {
    this.createAbortController();

    if (!this.isAvailable() || !this.audioContext || !this.masterGain) {
      await this.sleepWithAbort(durationMs);
      return;
    }

    const baseFreq = this.preferences.baseFrequency;
    const targetFreq = baseFreq * 2; // One octave up

    await this.playFrequencySweep(baseFreq, targetFreq, durationMs);
  }

  /**
   * Hold breath sound - gentle steady tone or silence
   * Creates sensation of stillness
   */
  async holdBreath(durationMs: number = 7000): Promise<void> {
    if (!this.isAvailable() || !this.audioContext || !this.masterGain) {
      await this.sleepWithAbort(durationMs);
      return;
    }

    // Soft, barely audible tone during hold
    const holdFreq = this.preferences.baseFrequency * 1.5; // Perfect fifth

    await this.playSteadyTone(holdFreq, durationMs, 0.15); // Very quiet
  }

  /**
   * Exhale sound - frequency falls smoothly
   * Creates sensation of release/settling
   */
  async breatheOut(durationMs: number = 8000): Promise<void> {
    if (!this.isAvailable() || !this.audioContext || !this.masterGain) {
      await this.sleepWithAbort(durationMs);
      return;
    }

    const baseFreq = this.preferences.baseFrequency;
    const targetFreq = baseFreq * 2;

    // Reverse sweep: high to low
    await this.playFrequencySweep(targetFreq, baseFreq, durationMs);
  }

  // ========== Celebration & Feedback ==========

  /**
   * Completion chime - pleasant harmonic sound
   */
  playCompletionChime(): void {
    if (!this.isAvailable() || !this.audioContext || !this.masterGain) {
      return;
    }

    const now = this.audioContext.currentTime;
    const baseFreq = this.preferences.baseFrequency;

    // Play a pleasant chord: root, major third, perfect fifth
    const frequencies = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
    const duration = 1.5;

    frequencies.forEach((freq, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq * 2; // One octave higher for brightness

      // Stagger the notes slightly for arpeggio effect
      const startTime = now + index * 0.1;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.preferences.volume * 0.5, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Session start tone - single gentle note
   */
  playSessionStart(): void {
    if (!this.isAvailable() || !this.audioContext || !this.masterGain) {
      return;
    }

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = this.preferences.baseFrequency * 2;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.preferences.volume * 0.4, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // ========== Internal Audio Methods ==========

  /**
   * Play a frequency sweep (for inhale/exhale)
   */
  private async playFrequencySweep(
    startFreq: number,
    endFreq: number,
    durationMs: number
  ): Promise<void> {
    if (!this.audioContext || !this.masterGain || this.isAborted()) {
      return;
    }

    const now = this.audioContext.currentTime;
    const durationSec = durationMs / 1000;

    // Create oscillator
    this.currentOscillator = this.audioContext.createOscillator();
    this.currentGain = this.audioContext.createGain();

    this.currentOscillator.type = this.preferences.toneType;
    this.currentOscillator.frequency.setValueAtTime(startFreq, now);
    this.currentOscillator.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec);

    // Envelope: fade in, sustain, fade out
    const fadeTime = Math.min(0.3, durationSec * 0.1);
    this.currentGain.gain.setValueAtTime(0, now);
    this.currentGain.gain.linearRampToValueAtTime(this.preferences.volume, now + fadeTime);
    this.currentGain.gain.setValueAtTime(this.preferences.volume, now + durationSec - fadeTime);
    this.currentGain.gain.linearRampToValueAtTime(0, now + durationSec);

    // Connect
    this.currentOscillator.connect(this.currentGain);
    this.currentGain.connect(this.masterGain);

    // Play
    this.currentOscillator.start(now);
    this.currentOscillator.stop(now + durationSec);

    // Wait for completion
    await this.sleepWithAbort(durationMs);

    // Cleanup
    this.stop();
  }

  /**
   * Play a steady tone (for hold phase)
   */
  private async playSteadyTone(
    frequency: number,
    durationMs: number,
    volumeMultiplier: number = 1
  ): Promise<void> {
    if (!this.audioContext || !this.masterGain || this.isAborted()) {
      return;
    }

    const now = this.audioContext.currentTime;
    const durationSec = durationMs / 1000;
    const volume = this.preferences.volume * volumeMultiplier;

    this.currentOscillator = this.audioContext.createOscillator();
    this.currentGain = this.audioContext.createGain();

    this.currentOscillator.type = 'sine'; // Always sine for hold (softer)
    this.currentOscillator.frequency.value = frequency;

    // Very soft envelope
    const fadeTime = Math.min(0.5, durationSec * 0.15);
    this.currentGain.gain.setValueAtTime(0, now);
    this.currentGain.gain.linearRampToValueAtTime(volume, now + fadeTime);
    this.currentGain.gain.setValueAtTime(volume, now + durationSec - fadeTime);
    this.currentGain.gain.linearRampToValueAtTime(0, now + durationSec);

    this.currentOscillator.connect(this.currentGain);
    this.currentGain.connect(this.masterGain);

    this.currentOscillator.start(now);
    this.currentOscillator.stop(now + durationSec);

    await this.sleepWithAbort(durationMs);
    this.stop();
  }

  /**
   * Sleep that can be aborted
   */
  private sleepWithAbort(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.isAborted()) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      this.abortController?.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeoutId);
          resolve();
        },
        { once: true }
      );
    });
  }

  /**
   * Cleanup on unmount
   */
  destroy(): void {
    this.abort();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.masterGain = null;
  }
}

// Export singleton instance
export const audio = new AudioService();

// Export type for testing
export type { AudioService };
