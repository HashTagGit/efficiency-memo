import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders primary variant by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByText('Primary');
    // Primary should have a solid background (bg-blue-600 or similar)
    expect(btn.className).toMatch(/bg-/);
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByText('Secondary');
    expect(btn.className).toMatch(/border/);
  });

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByText('Ghost');
    expect(btn.className).toMatch(/transparent|bg-transparent/);
  });

  it('renders danger variant', () => {
    render(<Button variant="danger">Danger</Button>);
    const btn = screen.getByText('Danger');
    expect(btn.className).toMatch(/red-/);
  });

  it('renders small size', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByText('Small');
    expect(btn.className).toMatch(/text-sm/);
  });

  it('renders medium size by default', () => {
    render(<Button>Medium</Button>);
    const btn = screen.getByText('Medium');
    expect(btn.className).toMatch(/text-base|px-4/);
  });

  it('renders large size', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByText('Large');
    expect(btn.className).toMatch(/text-lg|px-6/);
  });

  it('shows loading spinner and disables button when isLoading', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Submit
      </Button>
    );
    // Should show spinner (svg or element with role/status)
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Button should be disabled
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Click should not fire
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not show spinner when not loading', () => {
    render(<Button>Normal</Button>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('accepts data-testid', () => {
    render(<Button data-testid="my-button">Test</Button>);
    expect(screen.getByTestId('my-button')).toBeInTheDocument();
  });
});
