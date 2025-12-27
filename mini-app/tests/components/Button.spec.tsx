/**
 * Button Component Tests
 * ======================
 * Tests for reusable Button component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../src/components/common/Button';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    button: ({ children, onClick, disabled, className, whileTap, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} className={className} {...props}>
        {children}
      </button>
    ),
    div: ({ children, className, animate, transition, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

// Mock haptics service
vi.mock('@/services/haptics', () => ({
  haptics: {
    impact: vi.fn(),
  },
}));

describe('Button Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(<Button icon={<span data-testid="icon">+</span>}>Add</Button>);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should apply primary variant classes', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary-500');
    });

    it('should apply secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-night-700');
    });

    it('should apply ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
    });

    it('should apply danger variant classes', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red-500/20');
    });
  });

  describe('sizes', () => {
    it('should apply small size classes', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('text-sm');
    });

    it('should apply medium size classes by default', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('text-base');
    });

    it('should apply large size classes', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('text-lg');
    });
  });

  describe('fullWidth', () => {
    it('should not be full width by default', () => {
      render(<Button>Normal</Button>);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('w-full');
    });

    it('should apply full width class', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-full');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply disabled classes', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('opacity-50');
      expect(button.className).toContain('cursor-not-allowed');
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should be disabled when loading', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('click handling', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call haptics.impact when clicked', async () => {
      const { haptics } = await import('@/services/haptics');
      render(<Button onClick={() => {}}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(haptics.impact).toHaveBeenCalledWith('light');
    });

    it('should not call haptics when disabled', async () => {
      const { haptics } = await import('@/services/haptics');
      render(<Button disabled onClick={() => {}}>Disabled</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(haptics.impact).not.toHaveBeenCalled();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });
  });
});
