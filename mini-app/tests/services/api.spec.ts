/**
 * API Service Tests
 * =================
 * Unit tests for ApiService with Telegram initData authentication.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: SEC-001 (token storage), SEC-003 (initData validation)
 * - GDPR verification: GDPR-017 (Article 17: Right to Erasure)
 *
 * Security features tested:
 * - initData sent with every request
 * - Request timeout handling
 * - Error handling for network failures
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../src/services/api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock telegram service
vi.mock('../../src/services/telegram', () => ({
  telegram: {
    getInitData: vi.fn().mockReturnValue('mock-init-data-hash'),
  },
}));

// Mock AbortSignal.timeout (not available in jsdom)
const mockTimeoutSignal = {
  aborted: false,
  reason: undefined,
  throwIfAborted: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onabort: null,
};

const originalTimeoutFn = AbortSignal.timeout;
AbortSignal.timeout = vi.fn().mockReturnValue(mockTimeoutSignal);

// Mock AbortSignal.any (not available in jsdom)
const originalAnyFn = AbortSignal.any;
// @ts-expect-error - AbortSignal.any is newer API
AbortSignal.any = vi.fn().mockImplementation((signals: AbortSignal[]) => signals[0]);

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Restore original functions after all tests
  afterAll(() => {
    AbortSignal.timeout = originalTimeoutFn;
    if (originalAnyFn) {
      // @ts-expect-error - restore original
      AbortSignal.any = originalAnyFn;
    }
  });

  describe('Request Security', () => {
    it('should send X-Telegram-Init-Data header with every request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      await api.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Telegram-Init-Data': 'mock-init-data-hash',
          }),
        })
      );
    });

    it('should include Content-Type: application/json header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should use AbortSignal.timeout for request timeout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.getProfile();

      expect(AbortSignal.timeout).toHaveBeenCalledWith(10000);
    });
  });

  describe('User Profile', () => {
    describe('getProfile', () => {
      it('should fetch user profile', async () => {
        const mockProfile = {
          id: 'user-123',
          telegramId: 123456789,
          firstName: 'Test',
          evolutionStage: 'owlet',
          xp: 100,
          streak: 5,
          badges: ['first_session'],
          createdAt: '2026-01-01T00:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockProfile,
        });

        const result = await api.getProfile();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockProfile);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/user/profile'),
          expect.any(Object)
        );
      });

      it('should handle profile fetch error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

        const result = await api.getProfile();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('updateProfile', () => {
      it('should update user profile', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ firstName: 'Updated' }),
        });

        const result = await api.updateProfile({ firstName: 'Updated' });

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/user/profile'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ firstName: 'Updated' }),
          })
        );
      });
    });
  });

  describe('Breathing Sessions', () => {
    describe('logBreathingSession', () => {
      it('should log breathing session', async () => {
        const mockSession = {
          id: 'session-123',
          userId: 'user-123',
          patternId: 'relax',
          cycles: 5,
          duration: 180,
          completedAt: '2026-02-10T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSession,
        });

        const result = await api.logBreathingSession({
          patternId: 'relax',
          cycles: 5,
          duration: 180,
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSession);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/breathing/sessions'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              patternId: 'relax',
              cycles: 5,
              duration: 180,
            }),
          })
        );
      });
    });

    describe('getBreathingStats', () => {
      it('should fetch breathing statistics', async () => {
        const mockStats = {
          totalSessions: 50,
          totalMinutes: 300,
          currentStreak: 7,
          longestStreak: 14,
          favoritePattern: 'relax',
          weeklyProgress: [5, 10, 8, 12, 7, 5, 3],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        });

        const result = await api.getBreathingStats();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
      });
    });

    describe('getRecentSessions', () => {
      it('should fetch recent sessions with default limit', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

        await api.getRecentSessions();

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/breathing/sessions?limit=10'),
          expect.any(Object)
        );
      });

      it('should fetch recent sessions with custom limit', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

        await api.getRecentSessions(5);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/breathing/sessions?limit=5'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Evolution & Gamification', () => {
    describe('checkEvolution', () => {
      it('should check evolution status', async () => {
        const mockEvolution = {
          evolved: false,
          currentStage: 'owlet',
          progress: 45,
          nextStage: 'young_owl',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvolution,
        });

        const result = await api.checkEvolution();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockEvolution);
      });

      it('should handle evolution when at max stage', async () => {
        const mockEvolution = {
          evolved: false,
          currentStage: 'wise_owl',
          progress: 100,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvolution,
        });

        const result = await api.checkEvolution();

        expect(result.success).toBe(true);
        expect(result.data?.nextStage).toBeUndefined();
      });
    });

    describe('getBadges', () => {
      it('should fetch badges', async () => {
        const mockBadges = {
          earned: ['first_session', 'week_streak'],
          available: ['month_streak', 'sleep_master'],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockBadges,
        });

        const result = await api.getBadges();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBadges);
      });
    });

    describe('getQuests', () => {
      it('should fetch quests', async () => {
        const mockQuests = {
          active: [
            { id: 'q1', title: 'Daily breathing', progress: 3, target: 5 },
          ],
          available: [
            { id: 'q2', title: 'Week streak', description: 'Complete 7 days', reward: 50 },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockQuests,
        });

        const result = await api.getQuests();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockQuests);
      });
    });
  });

  describe('GDPR Article 17 - Right to Erasure', () => {
    describe('deleteUserData', () => {
      it('should delete all user data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            deleted: true,
            message: 'All user data has been deleted',
          }),
        });

        const result = await api.deleteUserData();

        expect(result.success).toBe(true);
        expect(result.data?.deleted).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/user/data'),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      it('should handle deletion failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
        });

        const result = await api.deleteUserData();

        expect(result.success).toBe(false);
        expect(result.error).toBe('Internal server error');
      });
    });
  });

  describe('Settings', () => {
    describe('getSettings', () => {
      it('should fetch user settings', async () => {
        const mockSettings = {
          hapticsEnabled: true,
          notificationsEnabled: false,
          reminderTime: '22:00',
          preferredPatterns: ['relax', 'sleep'],
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSettings,
        });

        const result = await api.getSettings();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockSettings);
      });
    });

    describe('updateSettings', () => {
      it('should update user settings', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

        const result = await api.updateSettings({
          hapticsEnabled: false,
          reminderTime: '21:30',
        });

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/settings'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              hapticsEnabled: false,
              reminderTime: '21:30',
            }),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');

      consoleSpy.mockRestore();
    });

    it('should handle timeout errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const timeoutError = new DOMException('The operation was aborted.', 'TimeoutError');
      mockFetch.mockRejectedValueOnce(timeoutError);

      const result = await api.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      consoleSpy.mockRestore();
    });

    it('should handle abort errors', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await api.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request cancelled');
    });

    it('should handle HTTP error without body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '',
      });

      const result = await api.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
    });

    it('should handle non-Error exceptions', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce('Unknown error');

      const result = await api.getProfile();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');

      consoleSpy.mockRestore();
    });
  });

  describe('URL Construction', () => {
    it('should use correct base URL for all endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await api.getProfile();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/user\/profile$/),
        expect.any(Object)
      );

      await api.getBreathingStats();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/breathing\/stats$/),
        expect.any(Object)
      );

      await api.getBadges();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/badges$/),
        expect.any(Object)
      );
    });
  });
});
