/**
 * API Service
 * ===========
 * Client for communicating with SleepCore backend.
 * Handles authentication via Telegram initData.
 */

import { telegram } from './telegram';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const initData = telegram.getInitData();

    try {
      const response = await fetch(url, {
        ...options,
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
   */
  async checkEvolution(): Promise<ApiResponse<{
    evolved: boolean;
    currentStage: string;
    progress: number;
    nextStage?: string;
  }>> {
    return this.request('/evolution/check');
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
