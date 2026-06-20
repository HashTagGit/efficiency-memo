import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../modal';

describe('Modal', () => {
  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Hidden">
        <p>Should not see this</p>
      </Modal>
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Overlay Test">
        <p>Content</p>
      </Modal>
    );
    // Click the overlay (backdrop)
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="ESC Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside modal content', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Content Test">
        <p data-testid="modal-body">Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId('modal-body'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders overlay with correct role', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Role Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has animation transition classes', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Animation Test">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/transition/);
  });

  it('uses design-token classes', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Token Test">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toMatch(/bg-surface-strong/);
    expect(dialog.className).toMatch(/border-border/);

    const title = screen.getByText('Token Test');
    expect(title.className).toMatch(/text-foreground/);

    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton.className).toMatch(/text-muted/);
    expect(closeButton.className).toMatch(/hover:text-foreground/);
    expect(closeButton.className).toMatch(/hover:bg-surface/);
  });
});
