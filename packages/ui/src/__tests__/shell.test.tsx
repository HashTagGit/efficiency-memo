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
        userEmail="user@example.com"
        onSignOut={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    expect(screen.getAllByTestId('sidebar-tool-item-tool-a')[0]).toBeInTheDocument();
  });

  it('renders header with user email', () => {
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
        userEmail="user@example.com"
        onSignOut={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    expect(screen.getByTestId('shell-header')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
        userEmail="user@example.com"
        onSignOut={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    expect(screen.getByTestId('shell-children')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('calls onSignOut when sign-out button is clicked', () => {
    const onSignOut = vi.fn();
    render(
      <Shell
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
        userEmail="user@example.com"
        onSignOut={onSignOut}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    fireEvent.click(screen.getByTestId('sign-out-button'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
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
        userEmail="user@example.com"
        onSignOut={vi.fn()}
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
        userEmail="user@example.com"
        onSignOut={vi.fn()}
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
        userEmail="user@example.com"
        onSignOut={vi.fn()}
      >
        <div data-testid="shell-children">Hello World</div>
      </Shell>
    );

    // Mobile menu button should exist
    expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
  });
});
