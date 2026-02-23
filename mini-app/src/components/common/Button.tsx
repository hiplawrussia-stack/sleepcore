/**
 * Button Component
 * ================
 * Reusable button with multiple variants and haptic feedback.
 *
 * PERFORMANCE: CSS-only animations, no motion dependency.
 * Uses active:scale-[0.97] for tap feedback, animate-spin for loading.
 */

import React from 'react';
import { haptics } from '@/services/haptics';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white',
  secondary: 'bg-night-700 hover:bg-night-600 text-night-100',
  ghost: 'bg-transparent hover:bg-night-800 text-night-300',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
};

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3.5 text-lg rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  className = '',
}) => {
  const handleClick = () => {
    if (disabled || loading) return;
    haptics.impact('light');
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        font-medium transition-all duration-100 flex items-center justify-center gap-2
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'}
        ${className}
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
