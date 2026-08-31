import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'secondary' | 'subtle' | 'floating' | 'large-rounded' | 'tab-translucent';
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
    // Solid Slate Deep Button with bright text
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 rounded-pill shadow-md border border-slate-800',
    
    // Vibrant Emerald Brand Button (high energy ride CTA)
    brand:
      'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 rounded-pill shadow-glow border border-emerald-500',
    
    // White secondary pill paired with primary dark
    secondary:
      'bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-pill border border-slate-200 shadow-sm font-bold',
    
    // Subtle gray pill
    subtle:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 rounded-pill border border-transparent font-medium',
    
    // Floating white pill with shadow
    floating:
      'bg-white text-slate-900 hover:bg-slate-50 rounded-pill shadow-pill-float border border-slate-200',
    
    // Large action button with rounded corners
    'large-rounded':
      'bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-body-lg border border-transparent shadow-md',
    
    // Hero tab button
    'tab-translucent':
      'rounded-xl font-semibold text-body-md text-slate-700 hover:text-slate-900 transition-colors',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-body-sm font-semibold',
    md: 'px-5 py-2.5 text-body-md-strong font-semibold',
    lg: 'px-6 py-3.5 text-body-lg font-bold',
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
