/**
 * Button Component
 * ================
 * Reusable button with multiple variants and haptic feedback.
 */

import React from 'react';
import { motion } from 'motion/react';
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
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        font-medium transition-colors flex items-center justify-center gap-2
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
        />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
};

export default Button;
