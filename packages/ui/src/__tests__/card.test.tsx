import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../card';

describe('Card', () => {
  it('renders title and description', () => {
    render(
      <Card
        title="Battery Tracker"
        description="Track your device battery levels"
      />
    );
    expect(screen.getByText('Battery Tracker')).toBeInTheDocument();
    expect(screen.getByText('Track your device battery levels')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <Card
        title="With Icon"
        description="Has an icon"
        icon={<span data-testid="card-icon">🔋</span>}
      />
    );
    expect(screen.getByTestId('card-icon')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <Card
        title="Clickable"
        description="Click me"
        onClick={handleClick}
      />
    );
    fireEvent.click(screen.getByText('Clickable').closest('[role="button"]') || screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as anchor when href is provided', () => {
    render(
      <Card
        title="Linked"
        description="Goes somewhere"
        href="/tools/battery"
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tools/battery');
  });

  it('has hover transition classes', () => {
    render(<Card title="Hover" description="Test hover" />);
    const card = screen.getByText('Hover').closest('[class*="transition"]') || screen.getByText('Hover').parentElement;
    expect(card?.className).toMatch(/transition/);
  });

  it('accepts data-testid', () => {
    render(<Card title="Test" description="Test" data-testid="my-card" />);
    expect(screen.getByTestId('my-card')).toBeInTheDocument();
  });

  it('uses design-token classes', () => {
    render(
      <Card
        title="Token Card"
        description="Design tokens"
        icon={<span data-testid="card-icon">icon</span>}
      />
    );
    const card = screen.getByText('Token Card').closest('[role="button"]');
    expect(card?.className).toMatch(/bg-card/);
    expect(card?.className).toMatch(/border-border/);
    expect(card?.className).toMatch(/text-foreground/);

    const iconContainer = screen.getByTestId('card-icon').parentElement;
    expect(iconContainer?.className).toMatch(/bg-accent\/10/);
    expect(iconContainer?.className).toMatch(/text-accent/);

    const title = screen.getByText('Token Card');
    expect(title.className).toMatch(/text-foreground/);

    const description = screen.getByText('Design tokens');
    expect(description.className).toMatch(/text-muted/);
  });
});
