/**
 * Card Component
 * ==============
 * Reusable card container with soft UI styling.
 */

import React from 'react';
import { motion } from 'motion/react';

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
  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`
        rounded-2xl transition-colors
        ${VARIANT_CLASSES[variant]}
        ${PADDING_CLASSES[padding]}
        ${onClick ? 'cursor-pointer hover:bg-night-700' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
};

export default Card;
