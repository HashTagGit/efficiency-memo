import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../sidebar';
import type { ToolManifest } from '@memo/shared';

const mockTools: ToolManifest[] = [
  { id: 'tool-a', name: 'Tool A', icon: 'icon-a', description: 'Desc A', routes: ['/a'], enabled: true },
  { id: 'tool-b', name: 'Tool B', icon: 'icon-b', description: 'Desc B', routes: ['/b'], enabled: true },
];

describe('Sidebar', () => {
  it('renders tool list items from tools prop', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByTestId('sidebar-tool-item-tool-a')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-tool-item-tool-b')).toBeInTheDocument();
    expect(screen.getByText('Tool A')).toBeInTheDocument();
    expect(screen.getByText('Tool B')).toBeInTheDocument();
  });

  it('highlights active tool', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId="tool-a"
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const activeItem = screen.getByTestId('sidebar-tool-item-tool-a');
    expect(activeItem.getAttribute('data-active')).toBe('true');

    const inactiveItem = screen.getByTestId('sidebar-tool-item-tool-b');
    expect(inactiveItem.getAttribute('data-active')).toBe('false');
  });

  it('calls onToolSelect when a tool is clicked', () => {
    const onToolSelect = vi.fn();
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={onToolSelect}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('sidebar-tool-item-tool-a'));
    expect(onToolSelect).toHaveBeenCalledWith('tool-a');
  });

  it('renders collapsed width class when isCollapsed is true', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={true}
        onToggle={vi.fn()}
      />
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.classList.contains('w-16')).toBe(true);
  });

  it('renders expanded width class when isCollapsed is false', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.classList.contains('w-60')).toBe(true);
  });

  it('calls onToggle when collapse button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByTestId('sidebar-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hides tool names when collapsed', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={true}
        onToggle={vi.fn()}
      />
    );

    const toolA = screen.getByTestId('sidebar-tool-item-tool-a');
    const nameSpan = toolA.querySelector('[data-testid="tool-name"]');
    expect(nameSpan?.classList.contains('hidden')).toBe(true);
  });

  it('shows tool names when expanded', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId=""
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const toolA = screen.getByTestId('sidebar-tool-item-tool-a');
    const nameSpan = toolA.querySelector('[data-testid="tool-name"]');
    expect(nameSpan?.classList.contains('hidden')).toBe(false);
  });

  it('uses design-token classes', () => {
    render(
      <Sidebar
        tools={mockTools}
        activeToolId="tool-a"
        onToolSelect={vi.fn()}
        isCollapsed={false}
        onToggle={vi.fn()}
      />
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toMatch(/bg-\[var\(--color-sidebar\)\]/);
    expect(sidebar.className).toMatch(/text-foreground/);

    const borderEl = sidebar.querySelector('.border-b');
    expect(borderEl?.className).toMatch(/border-border/);

    const activeItem = screen.getByTestId('sidebar-tool-item-tool-a');
    expect(activeItem.className).toMatch(/bg-\[var\(--color-active\)\]/);
    expect(activeItem.className).toMatch(/text-foreground/);

    const inactiveItem = screen.getByTestId('sidebar-tool-item-tool-b');
    expect(inactiveItem.className).toMatch(/text-muted/);
    expect(inactiveItem.className).toMatch(/hover:bg-\[var\(--color-sidebar-hover\)\]/);
  });
});
