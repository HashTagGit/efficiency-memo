'use client';

import React, { useState } from 'react';
import { Sidebar, type SidebarLabels } from './sidebar';
import type { ToolManifest } from '@memo/shared';

type Theme = 'dark' | 'light';

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === 'dark' ? (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export interface ShellProps {
  tools: ToolManifest[];
  activeToolId: string;
  onToolSelect: (toolId: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  theme?: Theme;
  onThemeToggle?: () => void;
  labels?: Partial<SidebarLabels>;
  localeLabel?: string;
  localeAriaLabel?: string;
  onLocaleToggle?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Shell({
  tools,
  activeToolId,
  onToolSelect,
  isCollapsed,
  onToggle,
  theme,
  onThemeToggle,
  labels,
  localeLabel,
  localeAriaLabel,
  onLocaleToggle,
  children,
  className,
  ...rest
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className={`flex h-[100dvh] w-full bg-background ${className ?? ''}`} {...rest}>
      {/* Desktop Sidebar */}
      <div data-testid="desktop-sidebar" className="hidden md:flex h-full flex-shrink-0">
        <Sidebar
          tools={tools}
          activeToolId={activeToolId}
          onToolSelect={onToolSelect}
          isCollapsed={isCollapsed}
          onToggle={onToggle}
          theme={theme}
          onThemeToggle={onThemeToggle}
          labels={labels}
          localeLabel={localeLabel}
          localeAriaLabel={localeAriaLabel}
          onLocaleToggle={onLocaleToggle}
        />
      </div>

      {/* Mobile Drawer */}
      <div className="md:hidden">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            data-testid="mobile-drawer-overlay"
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div
          className={`
            fixed top-0 left-0 h-full z-50
            transition-transform duration-200 ease-in-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar
            tools={tools}
            activeToolId={activeToolId}
            onToolSelect={(id) => {
              onToolSelect(id);
              setMobileOpen(false);
            }}
            isCollapsed={false}
            onToggle={() => setMobileOpen(false)}
            theme={theme}
            onThemeToggle={onThemeToggle}
            labels={labels}
            localeLabel={localeLabel}
            localeAriaLabel={localeAriaLabel}
            onLocaleToggle={onLocaleToggle}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header
          data-testid="shell-header"
          className="flex items-center px-4 py-3 bg-surface border-b border-border md:hidden"
        >
          <button type="button" data-testid="mobile-menu-button" onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-muted hover:bg-surface-strong hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring" aria-label="Open menu">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {theme && onThemeToggle && <button
            type="button"
            data-testid="mobile-theme-toggle"
            onClick={onThemeToggle}
            className="ml-auto inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted hover:bg-surface-strong hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label={theme === 'dark' ? (labels?.switchToLight ?? 'Switch to light mode') : (labels?.switchToDark ?? 'Switch to dark mode')}
            aria-pressed={theme === 'light'}
          >
            <ThemeIcon theme={theme} />
            <span>{theme === 'dark' ? (labels?.lightMode ?? 'Light mode') : (labels?.darkMode ?? 'Dark mode')}</span>
          </button>}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
