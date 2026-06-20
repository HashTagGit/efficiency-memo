import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState title="Empty" description="Nothing to show here yet" />,
    );
    expect(screen.getByText('Nothing to show here yet')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Nothing to show here')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="No items"
        icon={<span data-testid="empty-icon">📦</span>}
      />,
    );
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('does not render icon container when icon is omitted', () => {
    const { container } = render(<EmptyState title="No items" />);
    expect(container.querySelector('.text-muted.mb-4')).not.toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={<button data-testid="action-btn">Create one</button>}
      />,
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    expect(screen.getByText('Create one')).toBeInTheDocument();
  });

  it('does not render action slot when omitted', () => {
    const { container } = render(<EmptyState title="No items" />);
    expect(container.querySelector('[data-testid="action-btn"]')).not.toBeInTheDocument();
  });

  it('has data-testid="empty-state"', () => {
    render(<EmptyState title="Test" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('applies text-muted class to icon wrapper', () => {
    const { container } = render(
      <EmptyState
        title="Test"
        icon={<span>icon</span>}
      />,
    );
    const iconWrapper = container.querySelector('.text-muted.mb-4');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('applies text-foreground class to title', () => {
    render(<EmptyState title="My Title" />);
    const title = screen.getByText('My Title');
    expect(title.className).toMatch(/text-foreground/);
  });

  it('applies text-muted class to description', () => {
    render(
      <EmptyState title="Title" description="Some description" />,
    );
    const desc = screen.getByText('Some description');
    expect(desc.className).toMatch(/text-muted/);
  });

  it('accepts custom className', () => {
    render(<EmptyState title="Test" className="my-custom-class" />);
    const container = screen.getByTestId('empty-state');
    expect(container.className).toMatch(/my-custom-class/);
  });
});
