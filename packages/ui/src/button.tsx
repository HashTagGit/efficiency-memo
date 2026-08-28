'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-strong active:bg-accent-pressed disabled:bg-surface-strong disabled:text-muted',
  secondary:
    'bg-surface text-foreground border border-control-border hover:bg-surface-strong active:bg-background-soft disabled:border-border disabled:text-muted',
  ghost:
    'text-foreground hover:bg-surface active:bg-surface-strong disabled:bg-transparent disabled:text-muted',
  danger:
    'bg-danger text-background hover:bg-danger/90 active:bg-danger/80 disabled:bg-surface-strong disabled:text-muted',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  icon: 'h-9 w-9 p-0',
};

function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      role="status"
      aria-label="loading"
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-100 disabled:active:scale-100';

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading && (
        <LoadingSpinner className="w-4 h-4 mr-2" />
      )}
      {children}
    </button>
  );
}
