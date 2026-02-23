/**
 * Card Component
 * ==============
 * Reusable card container with soft UI styling.
 *
 * PERFORMANCE: CSS-only animations, no motion dependency.
 * Uses active:scale-[0.98] for tap feedback.
 */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

const VARIANT_CLASSES = {
  default: 'bg-night-800',
  elevated: 'bg-night-800 shadow-soft',
  outlined: 'bg-transparent border border-night-700',
  glass: 'bg-night-800/50 backdrop-blur-sm border border-night-700/50',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  variant = 'default',
  padding = 'md',
  className = '',
}) => {
  const baseClasses = `
    rounded-2xl transition-all duration-100
    ${VARIANT_CLASSES[variant]}
    ${PADDING_CLASSES[padding]}
    ${className}
  `;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} cursor-pointer hover:bg-night-700 active:scale-[0.98]`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {children}
    </div>
  );
};

export default Card;
