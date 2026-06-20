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
    it('info variant applies accent token classes', () => {
      render(<Alert variant="info">Info</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-accent\/10/);
      expect(alert.className).toMatch(/text-accent/);
      expect(alert.className).toMatch(/border-accent\/20/);
    });

    it('success variant applies emerald classes', () => {
      render(<Alert variant="success">Success</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-emerald-500\/10/);
      expect(alert.className).toMatch(/text-emerald-400/);
      expect(alert.className).toMatch(/border-emerald-500\/20/);
    });

    it('warning variant applies amber classes', () => {
      render(<Alert variant="warning">Warning</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-amber-500\/10/);
      expect(alert.className).toMatch(/text-amber-400/);
      expect(alert.className).toMatch(/border-amber-500\/20/);
    });

    it('error variant applies danger token classes', () => {
      render(<Alert variant="error">Error</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.className).toMatch(/bg-danger\/10/);
      expect(alert.className).toMatch(/text-danger/);
      expect(alert.className).toMatch(/border-danger\/20/);
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
