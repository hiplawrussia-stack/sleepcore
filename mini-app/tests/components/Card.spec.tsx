/**
 * Card Component Tests
 * ====================
 * Tests for reusable Card container component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../../src/components/common/Card';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, onClick, whileTap, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
    button: ({ children, className, onClick, whileTap, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
}));

describe('Card Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as div by default (no onClick)', () => {
      const { container } = render(<Card>Static card</Card>);
      // Without onClick, it should render as a div
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should render as button when onClick is provided', () => {
      render(<Card onClick={() => {}}>Clickable card</Card>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply default variant classes', () => {
      const { container } = render(<Card>Default</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-night-800');
    });

    it('should apply elevated variant classes', () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-night-800');
      expect(card.className).toContain('shadow-soft');
    });

    it('should apply outlined variant classes', () => {
      const { container } = render(<Card variant="outlined">Outlined</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-transparent');
      expect(card.className).toContain('border');
    });

    it('should apply glass variant classes', () => {
      const { container } = render(<Card variant="glass">Glass</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-night-800/50');
      expect(card.className).toContain('backdrop-blur-sm');
    });
  });

  describe('padding', () => {
    it('should apply no padding', () => {
      const { container } = render(<Card padding="none">No padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('p-');
    });

    it('should apply small padding', () => {
      const { container } = render(<Card padding="sm">Small padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-3');
    });

    it('should apply medium padding by default', () => {
      const { container } = render(<Card>Medium padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-4');
    });

    it('should apply large padding', () => {
      const { container } = render(<Card padding="lg">Large padding</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('p-6');
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable</Card>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should apply hover classes when clickable', () => {
      render(<Card onClick={() => {}}>Clickable</Card>);
      const card = screen.getByRole('button');
      expect(card.className).toContain('cursor-pointer');
      expect(card.className).toContain('hover:bg-night-700');
    });

    it('should not apply hover classes when not clickable', () => {
      const { container } = render(<Card>Static</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('cursor-pointer');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Custom</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });

    it('should combine custom className with variant classes', () => {
      const { container } = render(
        <Card variant="elevated" className="my-card">Combined</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('shadow-soft');
      expect(card.className).toContain('my-card');
    });
  });

  describe('styling', () => {
    it('should have rounded corners', () => {
      const { container } = render(<Card>Rounded</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('rounded-2xl');
    });

    it('should have transition classes', () => {
      const { container } = render(<Card>Transition</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('transition-colors');
    });
  });
});
