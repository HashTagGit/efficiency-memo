'use client';

import React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    { icon, title, description, action, className = '', ...rest },
    ref,
  ) {
    const classes = [
      'flex flex-col items-center justify-center py-16 text-center',
      className,
    ].join(' ');

    return (
      <div ref={ref} className={classes} data-testid="empty-state" {...rest}>
        {icon && (
          <div className="text-muted mb-4">{icon}</div>
        )}
        <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
        {description && (
          <p className="text-muted mb-6 max-w-md">{description}</p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  },
);
