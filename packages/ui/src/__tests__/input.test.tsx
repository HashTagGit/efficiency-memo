import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input data-testid="my-input" />);
    expect(screen.getByTestId('my-input')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('does not render label when omitted', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders placeholder', () => {
    render(<Input placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('handles value and onChange', () => {
    const handleChange = vi.fn();
    render(<Input value="hello" onChange={handleChange} />);
    const input = screen.getByTestId('input');
    expect(input).toHaveValue('hello');
    fireEvent.change(input, { target: { value: 'world' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state', () => {
    render(<Input disabled />);
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
  });

  it('applies disabled classes', () => {
    render(<Input disabled />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/disabled:opacity-50/);
    expect(input.className).toMatch(/disabled:cursor-not-allowed/);
  });

  it('renders error message when error is provided', () => {
    render(<Input error="Field is required" />);
    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('applies border-danger class when error is present', () => {
    render(<Input error="Invalid" />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/border-danger/);
  });

  it('applies text-danger class to error message', () => {
    const { container } = render(<Input error="Invalid" />);
    const errorEl = container.querySelector('.text-danger');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl?.textContent).toBe('Invalid');
  });

  it('applies border-control-border class when no error', () => {
    render(<Input />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/border-control-border/);
  });

  it('applies bg-surface token class', () => {
    render(<Input />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/bg-surface/);
  });

  it('applies text-foreground token class', () => {
    render(<Input />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/text-foreground/);
  });

  it('applies focus:ring-focus-ring token class', () => {
    render(<Input />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/focus:ring-focus-ring/);
  });

  it('applies focus:ring-danger when error is present', () => {
    render(<Input error="Oops" />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/focus:ring-danger/);
  });

  it('forwards additional input attributes', () => {
    render(<Input type="password" maxLength={20} data-testid="pw-input" />);
    const input = screen.getByTestId('pw-input');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('maxLength', '20');
  });

  it('accepts custom className', () => {
    render(<Input className="my-custom-class" />);
    const input = screen.getByTestId('input');
    expect(input.className).toMatch(/my-custom-class/);
  });
});
