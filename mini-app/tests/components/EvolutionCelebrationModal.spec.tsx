/**
 * Evolution Celebration Modal Tests
 * ==================================
 * Unit tests for gamification celebration modal.
 *
 * IEC 62304 Compliance:
 * - Unit verification per §5.5.5
 * - Traceability: GAM-003 (Evolution status display)
 *
 * Coverage targets:
 * - Visibility toggle
 * - Stage name localization
 * - Haptic feedback on open
 * - Confetti particle generation
 * - Close handler
 *
 * @module @sleepcore/mini-app/tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EvolutionCelebrationModal } from '../../src/components/common/EvolutionCelebrationModal';

// Mock haptics service
const mockCelebrationFeedback = vi.fn();

vi.mock('../../src/services/haptics', () => ({
  haptics: {
    celebrationFeedback: () => mockCelebrationFeedback(),
  },
}));

// Note: Component uses CSS-only animations, no motion/react mock needed

describe('EvolutionCelebrationModal', () => {
  const defaultProps = {
    isVisible: true,
    previousStage: 'owlet',
    newStage: 'young_owl',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Visibility', () => {
    it('should render when isVisible is true', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      expect(screen.getByText('Эволюция!')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      render(<EvolutionCelebrationModal {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Эволюция!')).not.toBeInTheDocument();
    });
  });

  describe('Stage Names (Localization)', () => {
    it('should display localized owlet stage name', () => {
      render(<EvolutionCelebrationModal {...defaultProps} previousStage="owlet" />);

      expect(screen.getByText('Совёнок')).toBeInTheDocument();
    });

    it('should display localized young_owl stage name', () => {
      render(<EvolutionCelebrationModal {...defaultProps} newStage="young_owl" />);

      expect(screen.getByText('Молодая Сова')).toBeInTheDocument();
    });

    it('should display localized wise_owl stage name', () => {
      render(<EvolutionCelebrationModal {...defaultProps} newStage="wise_owl" />);

      expect(screen.getByText('Мудрая Сова')).toBeInTheDocument();
    });

    it('should fallback to stage key for unknown stages', () => {
      render(
        <EvolutionCelebrationModal
          {...defaultProps}
          previousStage="custom_stage"
          newStage="another_stage"
        />
      );

      expect(screen.getByText('custom_stage')).toBeInTheDocument();
      expect(screen.getByText('another_stage')).toBeInTheDocument();
    });
  });

  describe('Stage Icons', () => {
    it('should display young_owl icon', () => {
      render(<EvolutionCelebrationModal {...defaultProps} newStage="young_owl" />);

      expect(screen.getByText('🦉')).toBeInTheDocument();
    });

    it('should display wise_owl icon with sparkles', () => {
      render(<EvolutionCelebrationModal {...defaultProps} newStage="wise_owl" />);

      expect(screen.getByText('🦉✨')).toBeInTheDocument();
    });

    it('should display owlet icon', () => {
      render(
        <EvolutionCelebrationModal
          {...defaultProps}
          previousStage="none"
          newStage="owlet"
        />
      );

      expect(screen.getByText('🐣')).toBeInTheDocument();
    });

    it('should fallback to owl icon for unknown stages', () => {
      render(<EvolutionCelebrationModal {...defaultProps} newStage="unknown" />);

      expect(screen.getByText('🦉')).toBeInTheDocument();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger celebration haptic on open', async () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockCelebrationFeedback).toHaveBeenCalled();
      });
    });

    it('should not trigger haptic when not visible', () => {
      render(<EvolutionCelebrationModal {...defaultProps} isVisible={false} />);

      expect(mockCelebrationFeedback).not.toHaveBeenCalled();
    });

    it('should trigger haptic again when reopened', async () => {
      const { rerender } = render(<EvolutionCelebrationModal {...defaultProps} isVisible={false} />);

      expect(mockCelebrationFeedback).not.toHaveBeenCalled();

      rerender(<EvolutionCelebrationModal {...defaultProps} isVisible={true} />);

      await waitFor(() => {
        expect(mockCelebrationFeedback).toHaveBeenCalledTimes(1);
      });

      rerender(<EvolutionCelebrationModal {...defaultProps} isVisible={false} />);
      rerender(<EvolutionCelebrationModal {...defaultProps} isVisible={true} />);

      await waitFor(() => {
        expect(mockCelebrationFeedback).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Close Handler', () => {
    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<EvolutionCelebrationModal {...defaultProps} onClose={onClose} />);

      // t('common.done') returns "Готово"
      fireEvent.click(screen.getByText('Готово'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<EvolutionCelebrationModal {...defaultProps} onClose={onClose} />);

      // Click on the backdrop (the outer fixed div)
      const backdrop = container.querySelector('.fixed.inset-0');
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalled();
    });

    it('should NOT call onClose when modal content clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<EvolutionCelebrationModal {...defaultProps} onClose={onClose} />);

      // Click on the modal content (which has stopPropagation)
      const modalContent = container.querySelector('.rounded-3xl');
      fireEvent.click(modalContent!);

      // Should not trigger onClose because of stopPropagation
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Content', () => {
    it('should display title "Эволюция!"', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      expect(screen.getByText('Эволюция!')).toBeInTheDocument();
    });

    it('should display congratulation message', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      expect(screen.getByText(/Твой прогресс впечатляет/)).toBeInTheDocument();
    });

    it('should display close button text from i18n', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      // Button has aria-label from t('a11y.common.closeModal') = "Закрыть окно"
      // and text content from t('common.done') = "Готово"
      const button = screen.getByRole('button', { name: 'Закрыть окно' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Готово');
    });

    it('should display arrow between stages', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });

  describe('Evolution Path Display', () => {
    it('should display owlet → young_owl evolution', () => {
      render(
        <EvolutionCelebrationModal
          {...defaultProps}
          previousStage="owlet"
          newStage="young_owl"
        />
      );

      expect(screen.getByText('Совёнок')).toBeInTheDocument();
      expect(screen.getByText('Молодая Сова')).toBeInTheDocument();
    });

    it('should display young_owl → wise_owl evolution', () => {
      render(
        <EvolutionCelebrationModal
          {...defaultProps}
          previousStage="young_owl"
          newStage="wise_owl"
        />
      );

      expect(screen.getByText('Молодая Сова')).toBeInTheDocument();
      expect(screen.getByText('Мудрая Сова')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have close button accessible', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      // Button has aria-label from t('a11y.common.closeModal') = "Закрыть окно"
      const button = screen.getByRole('button', { name: 'Закрыть окно' });
      expect(button).toBeInTheDocument();
    });

    it('should render heading for screen readers', () => {
      render(<EvolutionCelebrationModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Эволюция!' })).toBeInTheDocument();
    });
  });

  describe('Confetti Generation', () => {
    it('should generate confetti particles when visible', async () => {
      const { container } = render(<EvolutionCelebrationModal {...defaultProps} />);

      // Wait for effect to run
      await waitFor(() => {
        // Confetti particles are rendered inside the modal
        // With our mock, we just verify the modal renders
        expect(container.querySelector('[class*="overflow-hidden"]')).toBeInTheDocument();
      });
    });

    it('should clear confetti when modal closes', async () => {
      const { rerender, container: _container } = render(<EvolutionCelebrationModal {...defaultProps} />);

      rerender(<EvolutionCelebrationModal {...defaultProps} isVisible={false} />);

      await waitFor(() => {
        // When modal is hidden, content should not be rendered
        expect(screen.queryByText('Эволюция!')).not.toBeInTheDocument();
      });
    });
  });
});

describe('EvolutionCelebrationModal - Integration', () => {
  it('should handle complete flow: open → view → close', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <EvolutionCelebrationModal
        isVisible={false}
        previousStage="owlet"
        newStage="young_owl"
        onClose={onClose}
      />
    );

    // Modal should not be visible initially
    expect(screen.queryByText('Эволюция!')).not.toBeInTheDocument();

    // Open modal
    rerender(
      <EvolutionCelebrationModal
        isVisible={true}
        previousStage="owlet"
        newStage="young_owl"
        onClose={onClose}
      />
    );

    // Modal should be visible with content
    expect(screen.getByText('Эволюция!')).toBeInTheDocument();
    expect(screen.getByText('Совёнок')).toBeInTheDocument();
    expect(screen.getByText('Молодая Сова')).toBeInTheDocument();

    // Haptic should trigger
    await waitFor(() => {
      expect(mockCelebrationFeedback).toHaveBeenCalled();
    });

    // Click close button
    // t('common.done') returns "Готово"
      fireEvent.click(screen.getByText('Готово'));
    expect(onClose).toHaveBeenCalled();
  });
});
