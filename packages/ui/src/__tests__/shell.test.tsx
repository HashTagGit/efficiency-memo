import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Shell } from '../shell';
import type { ToolManifest } from '@memo/shared';

const mockTools: ToolManifest[] = [
  { id: 'tool-a', name: 'Tool A', icon: 'icon-a', description: 'Desc A', routes: ['/a'], enabled: true },
];

describe('Shell', () => {
  it('renders sidebar with tools', () => {
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    expect(screen.getAllByTestId('sidebar-tool-item-tool-a')[0]).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    expect(screen.getByTestId('shell-children')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('calls onToggle when sidebar toggle is clicked', () => {
    const onToggle = vi.fn();
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={onToggle}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    fireEvent.click(screen.getAllByTestId('sidebar-toggle')[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToolSelect when a tool is clicked', () => {
    const onToolSelect = vi.fn();
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={onToolSelect}
        isCollapsed={false}
        onToggle={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    fireEvent.click(screen.getAllByTestId('sidebar-tool-item-tool-a')[0]);
    expect(onToolSelect).toHaveBeenCalledWith('tool-a');
  });

  it('has mobile drawer overlay when mobile menu is open', () => {
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    // Mobile menu button should exist
    expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
  });

  it('uses design-token classes', () => {
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      >
        <div>Content</div>
      </Shell>
    );

    const shellRoot = screen.getByTestId('desktop-sidebar').parentElement;
    expect(shellRoot?.className).toMatch(/bg-background/);

    const header = screen.getByTestId('shell-header');
    expect(header.className).toMatch(/bg-surface/);
    expect(header.className).toMatch(/border-border/);

  });

  it('invokes the configured theme toggle', () => {
    const onThemeToggle = vi.fn();
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
        theme="dark"
        onThemeToggle={onThemeToggle}
      >
        <div>Content</div>
      </Shell>
    );

    fireEvent.click(screen.getByTestId('mobile-theme-toggle'));
    expect(onThemeToggle).toHaveBeenCalledTimes(1);
  });

  it('renders and invokes the locale control when configured', () => {
    const onLocaleToggle = vi.fn();
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
        localeLabel="中文"
        onLocaleToggle={onLocaleToggle}
      >
        <div>Content</div>
      </Shell>
    );

    fireEvent.click(screen.getAllByTestId('locale-toggle')[0]);
    expect(onLocaleToggle).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('中文')).toHaveLength(2);
  });
});
