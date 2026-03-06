/**
 * Breathing Page Tests
 * ====================
 * Unit tests for the Breathing exercise page.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: UI-002 (Breathing page)
 *
 * Coverage targets:
 * - Pattern validation from URL params
 * - Back button setup
 * - Session completion flow
 * - Evolution modal display
 * - Cancel handling
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Create mock values using vi.hoisted
const {
  mockNavigate,
  mockShowBackButton,
  mockHideBackButton,
  mockLogSession,
  mockRefetchEvolution,
  mockEvolution,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowBackButton: vi.fn(),
  mockHideBackButton: vi.fn(),
  mockLogSession: vi.fn().mockResolvedValue({ id: 'session-1', xpGain: 10 }),
  mockRefetchEvolution: vi.fn(),
  mockEvolution: {
    currentStage: 'owlet',
    stageName: 'Owlet',
    stageEmoji: '🐣',
    daysActive: 5,
    progress: 50,
    nextStage: 'young_owl',
    daysToNext: 2,
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock hooks - now using TanStack Query hooks
vi.mock('@/hooks', () => ({
  useTelegram: () => ({
    showBackButton: mockShowBackButton,
    hideBackButton: mockHideBackButton,
  }),
  useLogSession: () => ({
    logSession: mockLogSession,
    isLogging: false,
    lastXpGain: null,
  }),
  useEvolution: () => ({
    evolution: mockEvolution,
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetchEvolution,
  }),
}));

// Mock telegram service
vi.mock('@/services/telegram', () => ({
  telegram: {
    showAlert: vi.fn(),
  },
}));

// Mock HapticBreathing component
vi.mock('@/components/breathing', () => ({
  HapticBreathing: ({
    initialPatternId,
    onComplete,
    onCancel,
  }: {
    initialPatternId: string;
    onComplete?: (patternId: string, cycles: number, durationSeconds: number) => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="haptic-breathing" data-pattern={initialPatternId}>
      <button
        data-testid="complete-btn"
        onClick={() => onComplete?.(initialPatternId, 3, 60)}
      >
        Complete
      </button>
      <button data-testid="cancel-btn" onClick={() => onCancel?.()}>
        Cancel
      </button>
    </div>
  ),
}));

// Mock EvolutionCelebrationModal
vi.mock('@/components/common', () => ({
  EvolutionCelebrationModal: ({
    isVisible,
    previousStage,
    newStage,
    onClose,
  }: {
    isVisible: boolean;
    previousStage: string;
    newStage: string;
    onClose: () => void;
  }) =>
    isVisible ? (
      <div data-testid="evolution-modal" data-prev={previousStage} data-new={newStage}>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Mock patterns module
vi.mock('@/components/breathing/patterns', () => ({
  getPatternById: (id: string) => {
    const patterns: Record<string, object> = {
      '478': { id: '478', name: '4-7-8' },
      box: { id: 'box', name: 'Box Breathing' },
      relaxing: { id: 'relaxing', name: 'Relaxing' },
    };
    return patterns[id] || null;
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Import after mocks
import { Breathing } from '@/pages/Breathing';

describe('Breathing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: refetch returns same stage (no evolution)
    mockRefetchEvolution.mockResolvedValue({
      data: { ...mockEvolution },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderBreathing = (initialRoute = '/breathing') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Breathing />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render HapticBreathing component', () => {
      renderBreathing();

      expect(screen.getByTestId('haptic-breathing')).toBeInTheDocument();
    });

    it('should use default pattern (478) when no pattern param', () => {
      renderBreathing();

      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', '478');
    });

    it('should use pattern from URL params when valid', () => {
      renderBreathing('/breathing?pattern=box');

      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', 'box');
    });

    it('should fallback to default pattern when URL param is invalid', () => {
      renderBreathing('/breathing?pattern=invalid-pattern');

      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', '478');
    });

    it('should not show evolution modal initially', () => {
      renderBreathing();

      expect(screen.queryByTestId('evolution-modal')).not.toBeInTheDocument();
    });
  });

  describe('Back Button', () => {
    it('should setup back button on mount', () => {
      renderBreathing();

      expect(mockShowBackButton).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should navigate to home when back button pressed', () => {
      renderBreathing();

      // Get the callback passed to showBackButton and call it
      const backCallback = mockShowBackButton.mock.calls[0][0];
      backCallback();

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should hide back button on unmount', () => {
      const { unmount } = renderBreathing();

      unmount();

      expect(mockHideBackButton).toHaveBeenCalled();
    });
  });

  describe('Session Completion', () => {
    it('should log session on completion', async () => {
      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      expect(mockLogSession).toHaveBeenCalledWith({
        patternId: '478',
        patternName: '4-7-8',
        cycles: 3,
        duration: 60,
      });
    });

    it('should check evolution after logging session', async () => {
      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(mockRefetchEvolution).toHaveBeenCalled();
      });
    });

    it('should show evolution modal when stage changes', async () => {
      // Refetch returns a new stage (indicates evolution)
      mockRefetchEvolution.mockResolvedValue({
        data: { ...mockEvolution, currentStage: 'young_owl' },
      });

      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('evolution-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('evolution-modal')).toHaveAttribute('data-prev', 'owlet');
      expect(screen.getByTestId('evolution-modal')).toHaveAttribute('data-new', 'young_owl');
    });

    it('should not show evolution modal when stage unchanged', async () => {
      // Refetch returns same stage (no evolution)
      mockRefetchEvolution.mockResolvedValue({
        data: { ...mockEvolution, currentStage: 'owlet' },
      });

      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(mockRefetchEvolution).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('evolution-modal')).not.toBeInTheDocument();
    });

    it('should handle evolution check error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockRefetchEvolution.mockRejectedValue(new Error('Network error'));

      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      // Wait for all retries to complete (2 retries x 1s delay = 2s + processing time)
      await waitFor(
        () => {
          expect(consoleError).toHaveBeenCalledWith(
            '[Breathing] Failed to check evolution after retries:',
            expect.any(Error)
          );
        },
        { timeout: 5000 }
      );

      // Should not crash, modal should not appear
      expect(screen.queryByTestId('evolution-modal')).not.toBeInTheDocument();

      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }, 10000);
  });

  describe('Evolution Modal', () => {
    it('should close evolution modal when onClose called', async () => {
      mockRefetchEvolution.mockResolvedValue({
        data: { ...mockEvolution, currentStage: 'young_owl' },
      });

      renderBreathing();

      // Trigger completion to show modal
      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('evolution-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeBtn = screen.getByTestId('close-modal');
      await act(async () => {
        closeBtn.click();
      });

      expect(screen.queryByTestId('evolution-modal')).not.toBeInTheDocument();
    });
  });

  describe('Cancel Handling', () => {
    it('should handle cancel without error', async () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderBreathing();

      const cancelBtn = screen.getByTestId('cancel-btn');
      await act(async () => {
        cancelBtn.click();
      });

      expect(consoleLog).toHaveBeenCalledWith('[Breathing] Session cancelled');

      consoleLog.mockRestore();
    });
  });

  describe('Pattern Validation (Security)', () => {
    it('should reject XSS attempts in pattern param', () => {
      renderBreathing('/breathing?pattern=<script>alert(1)</script>');

      // Should fallback to default pattern
      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', '478');
    });

    it('should reject SQL injection attempts in pattern param', () => {
      renderBreathing("/breathing?pattern='; DROP TABLE users; --");

      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', '478');
    });

    it('should handle empty pattern param', () => {
      renderBreathing('/breathing?pattern=');

      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', '478');
    });

    it('should handle multiple pattern params (use first)', () => {
      renderBreathing('/breathing?pattern=box&pattern=relaxing');

      expect(screen.getByTestId('haptic-breathing')).toHaveAttribute('data-pattern', 'box');
    });
  });
});
