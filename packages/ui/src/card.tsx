'use client';

import React from 'react';

export interface CardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  'data-testid'?: string;
}

export function Card({
  title,
  description,
  icon,
  onClick,
  href,
  'data-testid': dataTestId,
}: CardProps) {
  const baseClasses =
    'group relative flex flex-col gap-3 p-6 rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer';

  const content = (
    <>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 transition-transform duration-200 group-hover:scale-110">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        role="link"
        className={baseClasses}
        data-testid={dataTestId}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={baseClasses}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      data-testid={dataTestId}
    >
      {content}
    </div>
  );
}
