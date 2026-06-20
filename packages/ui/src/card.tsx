'use client';

import React from 'react';

export interface CardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  'data-testid'?: string;
  className?: string;
}

export function Card({
  title,
  description,
  icon,
  onClick,
  href,
  'data-testid': dataTestId,
  className,
  ...rest
}: CardProps & React.HTMLAttributes<HTMLDivElement | HTMLAnchorElement>) {
  const baseClasses =
    'group relative flex flex-col gap-3 p-6 rounded-2xl border border-border bg-card shadow-sm text-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer';

  const mergedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  const content = (
    <>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent transition-transform duration-200 group-hover:scale-110">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </div>
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
