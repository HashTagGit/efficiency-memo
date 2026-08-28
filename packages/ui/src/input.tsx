'use client';

import React, { forwardRef } from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', disabled, ...rest }, ref) => {
    const inputClasses = [
      'w-full px-3 py-2 rounded-lg border bg-surface text-foreground',
      'placeholder:text-muted transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error ? 'border-danger focus:ring-danger' : 'border-control-border',
      className,
    ].join(' ');

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          data-testid="input"
          {...rest}
        />
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
