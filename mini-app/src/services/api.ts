/**
 * API Service - Telegram initData Authentication
 * ===============================================
 * Client for communicating with SleepCore backend.
 * Handles authentication via Telegram initData on every request.
 *
 * Security Features:
 * - initData sent with every request (X-Telegram-Init-Data header)
 * - Request timeout via AbortSignal.timeout()
 * - No tokens stored in localStorage
 *
 * @module @sleepcore/mini-app/services
 */

import { telegram } from './telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserProfile {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  evolutionStage: 'owlet' | 'young_owl' | 'wise_owl';
  xp: number;
  streak: number;
  badges: string[];
  createdAt: string;
}

export interface BreathingSession {
  id: string;
  userId: string;
  patternId: string;
  cycles: number;
  duration: number;
  completedAt: string;
}

export interface BreathingStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  favoritePattern: string;
  weeklyProgress: number[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make authenticated API request with timeout
   *
   * Security:
   * - initData sent in X-Telegram-Init-Data header
   * - Request timeout via AbortSignal.timeout()
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const initData = telegram.getInitData();

    try {
      // Create timeout signal
      const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

      // Combine with existing signal if provided
      const signal = options.signal
        ? AbortSignal.any([timeoutSignal, options.signal])
        : timeoutSignal;

      const response = await fetch(url, {
        ...options,
        signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      // Handle timeout specifically
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        console.error('[ApiService] Request timeout:', endpoint);
        return { success: false, error: `Request timeout after ${REQUEST_TIMEOUT_MS}ms` };
      }

      // Handle user cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, error: 'Request cancelled' };
      }

      console.error('[ApiService] Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // ========== User Profile ==========

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/user/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ========== Breathing Sessions ==========

  /**
   * Log completed breathing session
   */
  async logBreathingSession(session: {
    patternId: string;
    cycles: number;
    duration: number;
  }): Promise<ApiResponse<BreathingSession>> {
    return this.request<BreathingSession>('/breathing/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  /**
   * Get breathing statistics
   */
  async getBreathingStats(): Promise<ApiResponse<BreathingStats>> {
    return this.request<BreathingStats>('/breathing/stats');
  }

  /**
   * Get recent breathing sessions
   */
  async getRecentSessions(limit = 10): Promise<ApiResponse<BreathingSession[]>> {
    return this.request<BreathingSession[]>(`/breathing/sessions?limit=${limit}`);
  }

  // ========== Evolution & Gamification ==========

  /**
   * Check evolution status
   *
   * @returns Evolution status with current stage and progress
   */
  async checkEvolution(): Promise<ApiResponse<{
    evolved: boolean;
    currentStage: string;
    progress: number;
    nextStage?: string;
  }>> {
    return this.request('/user/evolution');
  }

  // ========== GDPR Article 17: Right to Erasure ==========

  /**
   * Delete all user data (GDPR Article 17)
   *
   * Compliance:
   * - Hard delete of active records
   * - Audit log preserved for compliance
   * - Response within 1 month (handled by backend)
   *
   * @see https://gdpr-info.eu/art-17-gdpr/
   */
  async deleteUserData(): Promise<ApiResponse<{ deleted: boolean; message: string }>> {
    return this.request('/user/data', {
      method: 'DELETE',
    });
  }

  /**
   * Get user badges
   */
  async getBadges(): Promise<ApiResponse<{
    earned: string[];
    available: string[];
  }>> {
    return this.request('/badges');
  }

  /**
   * Get active quests
   */
  async getQuests(): Promise<ApiResponse<{
    active: Array<{
      id: string;
      title: string;
      progress: number;
      target: number;
    }>;
    available: Array<{
      id: string;
      title: string;
      description: string;
      reward: number;
    }>;
  }>> {
    return this.request('/quests');
  }

  // ========== Settings ==========

  /**
   * Get user settings
   */
  async getSettings(): Promise<ApiResponse<{
    hapticsEnabled: boolean;
    notificationsEnabled: boolean;
    reminderTime?: string;
    preferredPatterns: string[];
  }>> {
    return this.request('/settings');
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: {
    hapticsEnabled?: boolean;
    notificationsEnabled?: boolean;
    reminderTime?: string;
    preferredPatterns?: string[];
  }): Promise<ApiResponse<void>> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

// Export singleton instance
export const api = new ApiService();
