'use client';

import React from 'react';
import type { ToolManifest } from '@memo/shared';

export interface SidebarProps {
  tools: ToolManifest[];
  activeToolId: string;
  onToolSelect: (toolId: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function Sidebar({
  tools,
  activeToolId,
  onToolSelect,
  isCollapsed,
  onToggle,
  className,
  ...rest
}: SidebarProps) {
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
      <div className="flex items-center justify-between p-3 border-b border-border">
        {!isCollapsed && (
          <span className="font-semibold text-sm truncate">EfficiencyMemo</span>
        )}
        <button
          data-testid="sidebar-toggle"
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-[var(--color-sidebar-hover)] transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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

      {/* Tool List */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-1 px-2">
          {tools.map((tool) => {
            const isActive = tool.id === activeToolId;
            return (
              <li key={tool.id}>
                <button
                  data-testid={`sidebar-tool-item-${tool.id}`}
                  data-active={isActive}
                  onClick={() => onToolSelect(tool.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-colors duration-150
                    ${isActive
                      ? 'bg-[var(--color-active)] text-foreground'
                      : 'text-muted hover:bg-[var(--color-sidebar-hover)] hover:text-foreground'
                    }
                  `}
                >
                  {/* Icon */}
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {tool.icon}
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
    </aside>
  );
}
