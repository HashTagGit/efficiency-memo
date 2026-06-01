'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import type { ToolManifest } from '@memo/shared';

export interface ShellProps {
  tools: ToolManifest[];
  activeToolId: string;
  onToolSelect: (toolId: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  userEmail: string;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function Shell({
  tools,
  activeToolId,
  onToolSelect,
  isCollapsed,
  onToggle,
  userEmail,
  onSignOut,
  children,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-neutral-50">
      {/* Desktop Sidebar */}
      <div data-testid="desktop-sidebar" className="hidden md:flex h-full flex-shrink-0">
        <Sidebar
          tools={tools}
          activeToolId={activeToolId}
          onToolSelect={onToolSelect}
          isCollapsed={isCollapsed}
          onToggle={onToggle}
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
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header
          data-testid="shell-header"
          className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200"
        >
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              data-testid="mobile-menu-button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-md hover:bg-neutral-100 transition-colors"
              aria-label="Open menu"
            >
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

            <span className="text-sm text-neutral-600 truncate max-w-[200px]">
              {userEmail}
            </span>
          </div>

          <button
            data-testid="sign-out-button"
            onClick={onSignOut}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
          >
            Sign out
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
