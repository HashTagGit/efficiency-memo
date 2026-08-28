'use client';

import React from 'react';

export interface CardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  openLabel?: string;
  'data-testid'?: string;
  className?: string;
}

export function Card({
  title,
  description,
  icon,
  onClick,
  href,
  openLabel = "Open",
  'data-testid': dataTestId,
  className,
  ...rest
}: CardProps & React.HTMLAttributes<HTMLDivElement | HTMLAnchorElement>) {
  const baseClasses =
    'group relative flex min-h-44 flex-col gap-3 rounded-xl border border-border bg-card p-6 text-foreground shadow-sm transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer';

  const mergedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  const content = (
    <>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent transition-transform duration-200 group-hover:scale-110">
          {icon}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent" aria-hidden="true">
        {openLabel}
        <span className="transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        role="link"
        className={mergedClasses}
        data-testid={dataTestId}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={mergedClasses}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      data-testid={dataTestId}
      {...rest}
    >
      {content}
    </div>
  );
}
