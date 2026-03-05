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
  mockProfile,
  mockApiRequest,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockShowBackButton: vi.fn(),
  mockHideBackButton: vi.fn(),
  mockLogSession: vi.fn().mockResolvedValue(undefined),
  mockProfile: {
    id: 'user-123',
    evolutionStage: 'owlet',
    xp: 100,
    level: 1,
  },
  mockApiRequest: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useTelegram hook
vi.mock('@/hooks', () => ({
  useTelegram: () => ({
    showBackButton: mockShowBackButton,
    hideBackButton: mockHideBackButton,
  }),
}));

// Mock useUserStore
vi.mock('@/store', () => ({
  useUserStore: () => ({
    logSession: mockLogSession,
    profile: mockProfile,
  }),
}));

// Mock apiClient
vi.mock('@/api', () => ({
  apiClient: {
    request: mockApiRequest,
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

// Import after mocks
import { Breathing } from '@/pages/Breathing';

describe('Breathing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue({ evolved: false, currentStage: 'owlet' });
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

      expect(mockLogSession).toHaveBeenCalledWith('478', '4-7-8', 3, 60);
    });

    it('should check evolution after logging session', async () => {
      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('/user/evolution');
      });
    });

    it('should show evolution modal when evolved', async () => {
      mockApiRequest.mockResolvedValue({
        evolved: true,
        currentStage: 'young_owl',
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

    it('should not show evolution modal when not evolved', async () => {
      mockApiRequest.mockResolvedValue({
        evolved: false,
        currentStage: 'owlet',
      });

      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('evolution-modal')).not.toBeInTheDocument();
    });

    it('should handle evolution API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      renderBreathing();

      const completeBtn = screen.getByTestId('complete-btn');
      await act(async () => {
        completeBtn.click();
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          '[Breathing] Failed to check evolution:',
          expect.any(Error)
        );
      });

      // Should not crash, modal should not appear
      expect(screen.queryByTestId('evolution-modal')).not.toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe('Evolution Modal', () => {
    it('should close evolution modal when onClose called', async () => {
      mockApiRequest.mockResolvedValue({
        evolved: true,
        currentStage: 'young_owl',
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
