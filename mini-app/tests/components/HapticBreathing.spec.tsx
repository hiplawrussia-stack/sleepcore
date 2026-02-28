/**
 * HapticBreathing Component Tests
 * ===============================
 * Tests for the main breathing exercise component with haptic feedback.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5
 * - UI component testing for breathing therapy
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock modules before imports
vi.mock('@/services/haptics', () => ({
  haptics: {
    breatheIn: vi.fn().mockResolvedValue(undefined),
    breatheOut: vi.fn().mockResolvedValue(undefined),
    holdBreath: vi.fn().mockResolvedValue(undefined),
    sessionStartFeedback: vi.fn(),
    celebrationFeedback: vi.fn(),
    selectionChanged: vi.fn(),
    notification: vi.fn(),
    abort: vi.fn(), // Added for cleanup support
  },
}));

vi.mock('@/services/telegram', () => ({
  telegram: {
    showMainButton: vi.fn(),
    hideMainButton: vi.fn(),
    updateMainButtonText: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown> | string) => {
      const translations: Record<string, string> = {
        'breathing.title': 'Выбери технику дыхания',
        'breathing.cycles.title': 'Количество циклов',
        'breathing.buttons.start': 'Начать',
        'breathing.buttons.stop': 'Остановить',
        'breathing.buttons.done': 'Готово',
        'breathing.progress': 'Цикл {{current}} из {{total}}',
        'breathing.sec': 'сек',
        'breathing.completion.title': 'Отлично!',
        'breathing.completion.message': 'Ты выполнил {{cycles}} циклов',
        // Accessibility translations
        'a11y.breathing.selectPattern': 'Выбрать технику дыхания: {{name}}',
        'a11y.breathing.patternSelected': 'Выбрано: {{name}}',
        'a11y.breathing.selectCycles': 'Выбрать количество циклов: {{count}}',
        'a11y.breathing.cyclesSelected': '{{count}} циклов выбрано',
      };
      let result = translations[key];
      if (!result) {
        // Return fallback if provided as second arg string, otherwise key
        return typeof params === 'string' ? params : key;
      }
      // Handle interpolation
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        });
      }
      return result;
    },
    i18n: {
      language: 'ru',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock motion/react to avoid animation issues in tests
vi.mock('motion/react', () => {
  const createMotionComponent = (tag: string) => {
    const Component = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Filter out motion-specific props
      const { animate: _animate, initial: _initial, exit: _exit, transition: _transition, variants: _variants, whileHover: _whileHover, whileTap: _whileTap, ...restProps } = props;
      return React.createElement(tag, restProps, children);
    };
    Component.displayName = `motion.${tag}`;
    return Component;
  };

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      circle: createMotionComponent('circle'),
      button: createMotionComponent('button'),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  };
});

import { HapticBreathing } from '@/components/breathing/HapticBreathing';
import { haptics } from '@/services/haptics';
import { telegram } from '@/services/telegram';
import { BREATHING_PATTERNS, getFreePatterns } from '@/components/breathing/patterns';

describe('HapticBreathing', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render pattern selector initially', () => {
      render(<HapticBreathing />);

      expect(screen.getByText('Выбери технику дыхания')).toBeInTheDocument();
    });

    it('should render all free patterns', () => {
      render(<HapticBreathing />);

      const freePatterns = getFreePatterns();
      freePatterns.forEach((pattern) => {
        expect(screen.getByText(pattern.nameRu)).toBeInTheDocument();
      });
    });

    it('should render cycle count selector', () => {
      render(<HapticBreathing />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show pattern description', () => {
      render(<HapticBreathing />);

      // Default pattern is 4-7-8
      const defaultPattern = BREATHING_PATTERNS.find((p) => p.id === '478');
      expect(screen.getByText(defaultPattern!.benefitRu)).toBeInTheDocument();
    });

    it('should show cycle count label', () => {
      render(<HapticBreathing />);

      // Now there are two elements: sr-only legend and aria-hidden span
      // Use getAllByText to verify the label is displayed
      const labels = screen.getAllByText('Количество циклов');
      expect(labels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('pattern selection', () => {
    it('should allow selecting different patterns', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<HapticBreathing />);

      // Find and click the Box Breathing pattern
      const boxPattern = screen.getByText('Квадратное дыхание');
      await user.click(boxPattern);

      expect(haptics.selectionChanged).toHaveBeenCalled();
    });

    it('should update description when pattern changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<HapticBreathing />);

      // Select Box Breathing
      const boxPattern = screen.getByText('Квадратное дыхание');
      await user.click(boxPattern);

      const pattern = BREATHING_PATTERNS.find((p) => p.id === 'box');
      expect(screen.getByText(pattern!.benefitRu)).toBeInTheDocument();
    });

    it('should highlight selected pattern', async () => {
      render(<HapticBreathing />);

      // Initially 4-7-8 should have checkmark - uses label elements now
      const patternLabel = screen.getByText('4-7-8 Релакс').closest('label');
      expect(patternLabel).toHaveClass('bg-primary-500/20');
    });

    it('should use initial pattern from props', () => {
      render(<HapticBreathing initialPatternId="box" />);

      const boxPattern = BREATHING_PATTERNS.find((p) => p.id === 'box');
      expect(screen.getByText(boxPattern!.benefitRu)).toBeInTheDocument();
    });
  });

  describe('cycle count selection', () => {
    it('should allow changing cycle count', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<HapticBreathing />);

      // Find cycle radios by filtering on name attribute
      const cycleRadios = screen.getAllByRole('radio').filter(
        (radio) => (radio as HTMLInputElement).name === 'breathing-cycles'
      );
      // Get the "5" cycle option (index 1: 3, 5, 7, 10)
      const button5 = cycleRadios[1];
      await user.click(button5);

      expect(haptics.selectionChanged).toHaveBeenCalled();
    });

    it('should update estimated duration when cycles change', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<HapticBreathing />);

      // Find cycle radios by filtering on name attribute
      const cycleRadios = screen.getAllByRole('radio').filter(
        (radio) => (radio as HTMLInputElement).name === 'breathing-cycles'
      );
      // Get the "5" cycle option (index 1: 3, 5, 7, 10)
      const button5 = cycleRadios[1];
      await user.click(button5);

      // Duration should update (4-7-8 pattern = 19 seconds per cycle, 5 cycles = 95 seconds)
      expect(screen.getByText(/~1 мин/)).toBeInTheDocument();
    });
  });

  describe('telegram main button integration', () => {
    it('should setup main button on mount', () => {
      render(<HapticBreathing />);

      expect(telegram.showMainButton).toHaveBeenCalledWith('Начать', expect.any(Function));
    });

    it('should hide main button on unmount', () => {
      const { unmount } = render(<HapticBreathing />);
      unmount();

      expect(telegram.hideMainButton).toHaveBeenCalled();
    });
  });

  describe('exercise flow', () => {
    it('should call sessionStartFeedback when starting exercise', async () => {
      render(<HapticBreathing onComplete={mockOnComplete} />);

      // Get the start function from the main button setup
      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      expect(haptics.sessionStartFeedback).toHaveBeenCalled();
    });

    it('should change main button text to stop when running', async () => {
      render(<HapticBreathing />);

      // Trigger start
      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // Advance time to allow state update
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(telegram.showMainButton).toHaveBeenCalledWith('Остановить', expect.any(Function));
    });

    it('should call haptics.breatheIn during inhale phase', async () => {
      render(<HapticBreathing />);

      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // After starting, breatheIn should be called
      await waitFor(() => {
        expect(haptics.breatheIn).toHaveBeenCalled();
      });
    });

    it('should call onCancel when stopping exercise', async () => {
      render(<HapticBreathing onCancel={mockOnCancel} />);

      // Start the exercise
      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // Wait for the stop button to be configured
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Find the stop function
      const stopCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Остановить'
      );
      const stopFn = stopCall?.[1];

      if (stopFn) {
        await act(async () => {
          stopFn();
        });
      }

      expect(mockOnCancel).toHaveBeenCalled();
      expect(haptics.notification).toHaveBeenCalledWith('warning');
    });
  });

  describe('completion', () => {
    it('should call onComplete with correct parameters', async () => {
      // Use a short pattern for faster test
      render(
        <HapticBreathing
          onComplete={mockOnComplete}
          initialPatternId="energizing" // 4-0-4 = 8 seconds per cycle
        />
      );

      // Select 3 cycles
      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // Fast-forward through all cycles using runAllTimersAsync to properly resolve promises
      // 3 cycles * 8 seconds = 24 seconds, but we need to run all pending timers
      await act(async () => {
        // Advance in chunks to allow promise resolution between intervals
        for (let i = 0; i < 300; i++) {
          vi.advanceTimersByTime(100);
          await Promise.resolve(); // Allow microtasks to process
        }
      });

      // Wait for completion with longer timeout since async timers are complex
      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      expect(mockOnComplete).toHaveBeenCalledWith(
        'energizing',
        3, // default cycles
        expect.any(Number) // duration in seconds
      );
    });

    it('should call celebrationFeedback on completion', async () => {
      render(
        <HapticBreathing
          onComplete={mockOnComplete}
          initialPatternId="energizing"
        />
      );

      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // Fast-forward through exercise - advance in chunks for proper promise resolution
      await act(async () => {
        for (let i = 0; i < 300; i++) {
          vi.advanceTimersByTime(100);
          await Promise.resolve();
        }
      });

      await waitFor(
        () => {
          expect(haptics.celebrationFeedback).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );
    });
  });

  describe('progress display', () => {
    it('should show progress dots during exercise', async () => {
      render(<HapticBreathing />);

      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // Progress indicator should appear
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should show cycle indicator
      expect(screen.getByText(/Цикл 1 из 3/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible pattern buttons with native radio inputs', () => {
      render(<HapticBreathing />);

      // Native radio inputs inside fieldset with legend
      // Pattern radios are grouped by name="breathing-pattern"
      const patternRadios = screen.getAllByRole('radio');
      expect(patternRadios.length).toBeGreaterThan(0);

      // Should have fieldset with legend for pattern selection
      const patternFieldset = screen.getByRole('group', { name: /выбери технику дыхания/i });
      expect(patternFieldset).toBeInTheDocument();
    });

    it('should have accessible cycle count buttons with native radio inputs', () => {
      render(<HapticBreathing />);

      // Native radio inputs with label text as accessible name
      // Cycle radios are grouped by name="breathing-cycles"
      const cycleRadios = screen.getAllByRole('radio').filter(
        (radio) => (radio as HTMLInputElement).name === 'breathing-cycles'
      );

      expect(cycleRadios).toHaveLength(4); // 3, 5, 7, 10

      // Should have fieldset with legend for cycle selection
      const cycleFieldset = screen.getByRole('group', { name: /количество циклов/i });
      expect(cycleFieldset).toBeInTheDocument();
    });
  });

  describe('pattern timing display', () => {
    it('should show pattern timing in button', () => {
      render(<HapticBreathing />);

      // 4-7-8 pattern should show its timing
      expect(screen.getByText(/4-7-8 сек/)).toBeInTheDocument();
    });

    it('should show hold2 timing for box breathing', () => {
      render(<HapticBreathing initialPatternId="box" />);

      // Box breathing is 4-4-4-4
      expect(screen.getByText(/4-4-4-4 сек/)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle missing initial pattern gracefully', () => {
      render(<HapticBreathing initialPatternId="non-existent" />);

      // Should fall back to first pattern
      const firstPattern = BREATHING_PATTERNS[0];
      expect(screen.getByText(firstPattern.benefitRu)).toBeInTheDocument();
    });

    it('should cleanup timers on unmount', async () => {
      const { unmount } = render(<HapticBreathing />);

      // Start exercise
      const startCall = vi.mocked(telegram.showMainButton).mock.calls.find(
        (call) => call[0] === 'Начать'
      );
      const startFn = startCall?.[1];

      if (startFn) {
        await act(async () => {
          startFn();
        });
      }

      // Unmount during exercise
      unmount();

      // Should not throw any errors when timers fire
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
    });
  });
});
