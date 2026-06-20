import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <PageHeader title="Dashboard" subtitle="Your personal tool gallery" />,
    );
    expect(screen.getByText('Your personal tool gallery')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByText('Your personal')).not.toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <PageHeader
        title="Settings"
        action={<button data-testid="action-btn">Save</button>}
      />,
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render action slot when omitted', () => {
    const { container } = render(<PageHeader title="Settings" />);
    expect(container.querySelector('.flex.items-center.gap-3')).not.toBeInTheDocument();
  });

  it('has data-testid="page-header"', () => {
    render(<PageHeader title="Test" />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('applies text-foreground class to title', () => {
    render(<PageHeader title="My Page" />);
    const title = screen.getByText('My Page');
    expect(title.className).toMatch(/text-foreground/);
  });

  it('applies font-display class to title', () => {
    render(<PageHeader title="My Page" />);
    const title = screen.getByText('My Page');
    expect(title.className).toMatch(/font-display/);
  });

  it('applies text-muted class to subtitle', () => {
    render(
      <PageHeader title="Title" subtitle="Subtitle text" />,
    );
    const subtitle = screen.getByText('Subtitle text');
    expect(subtitle.className).toMatch(/text-muted/);
  });

  it('applies mb-6 container class', () => {
    render(<PageHeader title="Test" />);
    const header = screen.getByTestId('page-header');
    expect(header.className).toMatch(/mb-6/);
  });

  it('accepts custom className', () => {
    render(<PageHeader title="Test" className="my-custom-class" />);
    const header = screen.getByTestId('page-header');
    expect(header.className).toMatch(/my-custom-class/);
  });
});
