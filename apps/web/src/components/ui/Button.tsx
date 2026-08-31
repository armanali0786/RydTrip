import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'dark' | 'circular' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const variants = {
    // Primary Wise Lime-Green CTA (#9fe870) with 24px radius
    primary:
      'bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad] active:bg-[#c5edab] rounded-xl font-bold shadow-sm',

    // Secondary Sage-Tinted Pill
    secondary:
      'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8dcd5] active:bg-[#c8ccc5] rounded-xl font-semibold',

    // Subtle variant alias
    subtle:
      'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8dcd5] active:bg-[#c8ccc5] rounded-xl font-semibold',

    // Tertiary Outline White Pill with 1px ink border
    tertiary:
      'bg-white text-[#0e0f0c] border border-[#0e0f0c] hover:bg-[#f4f6f3] active:bg-[#e8ebe6] rounded-xl font-semibold',

    // Dark Polarity-Flipped Pill (Wise near-black with green text)
    dark:
      'bg-[#0e0f0c] text-[#9fe870] hover:bg-[#1b1c18] active:bg-[#252722] rounded-xl font-bold',

    // Circular Icon Button
    circular:
      'bg-white text-[#0e0f0c] border border-[#0e0f0c] hover:bg-[#e8ebe6] rounded-full p-3 font-semibold',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm font-semibold',
    md: 'px-6 py-3 text-base font-semibold',
    lg: 'px-8 py-4 text-lg font-bold',
  };

  return (
    <button
      className={twMerge(
        clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )
      )}
      {...props}
    >
      {children}
    </button>
  );
};
