'use client';

import React from 'react';
import type { ToolManifest } from '@memo/shared';

function ToolIcon({ name }: { name: string }) {
  if (name === 'clock') {
    return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }
  if (name === 'droplet') {
    return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5S6.5 9.2 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.2 12 3.5 12 3.5Z" /><path d="M9.5 15.2a2.8 2.8 0 0 0 2.5 1.6" /></svg>;
  }
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
}

export interface SidebarProps {
  tools: ToolManifest[];
  activeToolId: string;
  onToolSelect: (toolId: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  theme?: 'dark' | 'light';
  onThemeToggle?: () => void;
  localeLabel?: string;
  localeAriaLabel?: string;
  onLocaleToggle?: () => void;
  labels?: Partial<SidebarLabels>;
  className?: string;
}

export interface SidebarLabels {
  appName: string;
  tools: string;
  settings: string;
  lightMode: string;
  darkMode: string;
  switchToLight: string;
  switchToDark: string;
  collapseSidebar: string;
  expandSidebar: string;
  language: string;
  openHome: string;
}

const defaultLabels: SidebarLabels = {
  appName: "EfficiencyMemo",
  tools: "Tools",
  settings: "Settings",
  lightMode: "Light mode",
  darkMode: "Dark mode",
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",
  collapseSidebar: "Collapse sidebar",
  expandSidebar: "Expand sidebar",
  language: "Language",
  openHome: "Open Now",
};

export function Sidebar({
  tools,
  activeToolId,
  onToolSelect,
  isCollapsed,
  onToggle,
  theme,
  onThemeToggle,
  localeLabel,
  localeAriaLabel,
  onLocaleToggle,
  labels: labelOverrides,
  className,
  ...rest
}: SidebarProps) {
  const labels = { ...defaultLabels, ...labelOverrides };
  return (
    <aside
      data-testid="sidebar"
      {...rest}
      className={`
        flex flex-col h-full bg-[var(--color-sidebar)] text-foreground
        transition-all duration-200 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-60'}
        ${className ?? ''}
      `}
    >
      {/* Header / Toggle */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <button
          type="button"
          data-testid="sidebar-home"
          onClick={() => onToolSelect('home')}
          className={`flex min-w-0 flex-1 items-center rounded-md p-1 text-left text-foreground hover:bg-[var(--color-sidebar-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${activeToolId === 'home' ? 'bg-[var(--color-active)]' : ''}`}
          data-active={activeToolId === 'home'}
          aria-label={labels.openHome}
          title={labels.openHome}
        >
          {isCollapsed ? (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 9-8 9 8" />
              <path d="M5 10v10h14V10M9 20v-6h6v6" />
            </svg>
          ) : (
            <span className="truncate text-sm font-semibold">{labels.appName}</span>
          )}
        </button>
        <button
          type="button"
          data-testid="sidebar-toggle"
          onClick={onToggle}
          className="rounded-md p-1.5 transition-colors hover:bg-[var(--color-sidebar-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          aria-label={isCollapsed ? labels.expandSidebar : labels.collapseSidebar}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <nav className="scrollbar-hidden flex-1 overflow-y-auto px-2 py-4" aria-label="Workspace">
        {!isCollapsed && <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{labels.tools}</p>}
        <ul className="space-y-1">
          {tools.filter((tool) => tool.id !== 'settings').map((tool) => {
            const isActive = tool.id === activeToolId;
            return (
              <li key={tool.id}>
                <button
                  data-testid={`sidebar-tool-item-${tool.id}`}
                  data-active={isActive}
                  onClick={() => onToolSelect(tool.id)}
                  className={`
                    relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left
                    transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                    ${isActive
                      ? 'bg-[var(--color-active)] text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--module-accent)]'
                      : 'text-muted hover:bg-[var(--color-sidebar-hover)] hover:text-foreground'
                    }
                  `}
                >
                  {/* Icon */}
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    <ToolIcon name={tool.icon} />
                  </span>

                  {/* Name */}
                  <span
                    data-testid="tool-name"
                    className={`text-sm font-medium truncate transition-all duration-200 ${
                      isCollapsed ? 'hidden' : 'block'
                    }`}
                  >
                    {tool.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-border p-2">
        {tools.filter((tool) => tool.id === 'settings').map((tool) => {
          const isActive = tool.id === activeToolId;
          return (
            <button
              key={tool.id}
              type="button"
              data-testid={`sidebar-tool-item-${tool.id}`}
              data-active={isActive}
              onClick={() => onToolSelect(tool.id)}
              className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${isActive ? 'bg-[var(--color-active)] text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--module-accent)]' : 'text-muted hover:bg-[var(--color-sidebar-hover)] hover:text-foreground'}`}
            >
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center"><ToolIcon name={tool.icon} /></span>
              <span data-testid="tool-name" className={`truncate text-sm font-medium ${isCollapsed ? 'hidden' : 'block'}`}>{tool.name}</span>
            </button>
          );
        })}
        {onThemeToggle && theme && (
          <button
            data-testid="theme-toggle"
            type="button"
            onClick={onThemeToggle}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-muted hover:bg-[var(--color-sidebar-hover)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label={theme === 'dark' ? labels.switchToLight : labels.switchToDark}
            aria-pressed={theme === 'light'}
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
              {theme === 'dark' ? (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg>
              ) : (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8Z" /></svg>
              )}
            </span>
            <span className={`truncate text-sm font-medium ${isCollapsed ? 'hidden' : 'block'}`}>{theme === 'dark' ? labels.lightMode : labels.darkMode}</span>
          </button>
        )}
        {onLocaleToggle && localeLabel && (
          <button
            data-testid="locale-toggle"
            type="button"
            onClick={onLocaleToggle}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-muted hover:bg-[var(--color-sidebar-hover)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label={localeAriaLabel ?? labels.language}
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-xs font-semibold">文</span>
            <span className={`truncate text-sm font-medium ${isCollapsed ? 'hidden' : 'block'}`}>{localeLabel}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
