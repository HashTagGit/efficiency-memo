import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../alert';

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert variant="info">Alert body text</Alert>);
    expect(screen.getByText('Alert body text')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert variant="info" title="Heads up">Body</Alert>);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('does not render title when omitted', () => {
    render(<Alert variant="info">Body</Alert>);
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();
  });

  it('has role="alert"', () => {
    render(<Alert variant="info">Body</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has data-testid="alert"', () => {
    render(<Alert variant="info">Body</Alert>);
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  describe('variant classes', () => {
    it('info variant applies semantic token classes', () => {
      render(<Alert variant="info">Info</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-info-container/);
      expect(alert.className).toMatch(/text-info/);
      expect(alert.className).toMatch(/border-info-border/);
    });

    it('success variant applies semantic token classes', () => {
      render(<Alert variant="success">Success</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-success-container/);
      expect(alert.className).toMatch(/text-success/);
      expect(alert.className).toMatch(/border-success-border/);
    });

    it('warning variant applies semantic token classes', () => {
      render(<Alert variant="warning">Warning</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-warning-container/);
      expect(alert.className).toMatch(/text-warning/);
      expect(alert.className).toMatch(/border-warning-border/);
    });

    it('error variant applies semantic token classes', () => {
      render(<Alert variant="error">Error</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-danger-container/);
      expect(alert.className).toMatch(/text-danger/);
      expect(alert.className).toMatch(/border-danger-border/);
    });
  });

  it('does not render dismiss button when dismissible is false', () => {
    render(<Alert variant="info">Body</Alert>);
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('renders dismiss button when dismissible is true', () => {
    render(<Alert variant="info" dismissible>Body</Alert>);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn();
    render(
      <Alert variant="info" dismissible onDismiss={handleDismiss}>
        Body
      </Alert>,
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('accepts custom className', () => {
    render(<Alert variant="info" className="my-custom-class">Body</Alert>);
    const alert = screen.getByTestId('alert');
    expect(alert.className).toMatch(/my-custom-class/);
  });
});
