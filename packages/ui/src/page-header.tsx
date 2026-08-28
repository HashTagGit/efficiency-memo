'use client';

import React from 'react';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  function PageHeader({ title, subtitle, action, className = '', ...rest }, ref) {
    const containerClasses = [
      'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6',
      className,
    ].join(' ');

    return (
      <div ref={ref} className={containerClasses} data-testid="page-header" {...rest}>
        <div className="border-l-[3px] border-[var(--module-accent)] pl-4">
          <h1 className="text-3xl font-bold text-foreground font-display">{title}</h1>
          {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-3">{action}</div>}
      </div>
    );
  }
);
