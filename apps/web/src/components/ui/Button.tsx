import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'floating' | 'large-rounded' | 'tab-translucent';
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
    'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants = {
    // Canonical black conversion target pill (999px)
    primary:
      'bg-primary text-on-dark hover:bg-black-elevated active:bg-black rounded-pill border border-transparent',
    
    // White secondary pill (999px) paired with primary black
    secondary:
      'bg-canvas text-ink hover:bg-canvas-soft active:bg-surface-pressed rounded-pill border border-canvas-soft shadow-sm',
    
    // Subtle gray pill (999px)
    subtle:
      'bg-canvas-soft text-ink hover:bg-surface-pressed active:bg-[#d5d5d5] rounded-pill border border-transparent',
    
    // Floating white pill with shadow level 3
    floating:
      'bg-canvas text-ink hover:bg-canvas-soft rounded-pill shadow-pill-float border border-canvas-soft',
    
    // Form action button rounded to 16px (the documented exception)
    'large-rounded':
      'bg-primary text-on-dark hover:bg-black-elevated rounded-xl font-medium text-body-lg border border-transparent',
    
    // Hero translucent tab toggle button (36px rounded)
    'tab-translucent':
      'rounded-pill-tab font-medium text-body-md text-ink transition-colors',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-body-sm',
    md: 'px-5 py-2.5 text-body-md-strong',
    lg: 'px-6 py-3.5 text-body-lg',
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
