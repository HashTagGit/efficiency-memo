'use client';

import React, { forwardRef } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-info-container text-info border-info-border',
  success: 'bg-success-container text-success border-success-border',
  warning: 'bg-warning-container text-warning border-warning-border',
  error: 'bg-danger-container text-danger border-danger-border',
};

function InfoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function DismissIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const iconMap: Record<AlertVariant, React.ComponentType> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    variant,
    title,
    dismissible = false,
    onDismiss,
    children,
    className = '',
    ...rest
  },
  ref,
) {
  const Icon = iconMap[variant];

  const containerClasses = [
    'relative flex gap-3 p-4 rounded-lg border',
    variantClasses[variant],
    className,
  ].join(' ');

  return (
    <div ref={ref} className={containerClasses} role="alert" data-testid="alert" {...rest}>
      <span className="mt-0.5 flex-shrink-0">
        <Icon />
      </span>

      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-sm mb-1">{title}</p>
        )}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <DismissIcon />
        </button>
      )}
    </div>
  );
});
