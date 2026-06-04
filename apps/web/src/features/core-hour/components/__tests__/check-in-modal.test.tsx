import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckInModal } from "../check-in-modal";
import type { Session, Tag } from "../../types";

const mockSession: Session = {
  id: "session-1",
  user_id: "user-1",
  started_at: "2025-06-01T10:00:00Z",
  ended_at: null,
  interval_minutes: 60,
  synced: false,
};

const mockTags: Tag[] = [
  {
    id: "tag-1",
    user_id: "user-1",
    name: "Deep Work",
    color: "#3b82f6",
    is_archived: false,
    created_at: "2025-01-01T00:00:00Z",
    synced: false,
  },
  {
    id: "tag-2",
    user_id: "user-1",
    name: "Meetings",
    color: "#f59e0b",
    is_archived: false,
    created_at: "2025-01-01T00:00:00Z",
    synced: false,
  },
  {
    id: "tag-3",
    user_id: "user-1",
    name: "Admin",
    color: "#10b981",
    is_archived: false,
    created_at: "2025-01-01T00:00:00Z",
    synced: false,
  },
];

describe("CheckInModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    session: mockSession,
    tags: mockTags,
  };

  describe("modal rendering", () => {
    it("renders when isOpen is true", () => {
      render(<CheckInModal {...defaultProps} />);
      expect(screen.getByTestId("check-in-modal")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<CheckInModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId("check-in-modal")).not.toBeInTheDocument();
    });

    it("renders modal with correct title", () => {
      render(<CheckInModal {...defaultProps} />);
      expect(screen.getByText("Core Hour Check-In")).toBeInTheDocument();
    });
  });

  describe("session info", () => {
    it("displays session started time", () => {
      render(<CheckInModal {...defaultProps} />);
      expect(screen.getByText(/started at/i)).toBeInTheDocument();
    });

    it("displays elapsed time", () => {
      render(<CheckInModal {...defaultProps} />);
      expect(screen.getByText(/elapsed/i)).toBeInTheDocument();
    });
  });

  describe("tag list", () => {
    it("renders all tags", () => {
      render(<CheckInModal {...defaultProps} />);
      expect(screen.getByText("Deep Work")).toBeInTheDocument();
      expect(screen.getByText("Meetings")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows no tags message when tags array is empty", () => {
      render(<CheckInModal {...defaultProps} tags={[]} />);
      expect(screen.getByText("No tags available")).toBeInTheDocument();
    });
  });

  describe("tag selection", () => {
    it("shows percentage input when tag is selected", () => {
      render(<CheckInModal {...defaultProps} />);
      const checkbox = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(checkbox);
      expect(screen.getByTestId("tag-percentage-tag-1")).toBeInTheDocument();
    });

    it("hides percentage input when tag is deselected", () => {
      render(<CheckInModal {...defaultProps} />);
      const checkbox = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(checkbox);
      expect(screen.getByTestId("tag-percentage-tag-1")).toBeInTheDocument();
      fireEvent.click(checkbox);
      expect(screen.queryByTestId("tag-percentage-tag-1")).not.toBeInTheDocument();
    });

    it("updates percentage value on input change", () => {
      render(<CheckInModal {...defaultProps} />);
      const checkbox = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(checkbox);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "50" } });
      expect(input.value).toBe("50");
    });

    it("clamps percentage to max 100", () => {
      render(<CheckInModal {...defaultProps} />);
      const checkbox = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(checkbox);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "150" } });
      expect(input.value).toBe("100");
    });

    it("clamps percentage to min 0", () => {
      render(<CheckInModal {...defaultProps} />);
      const checkbox = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(checkbox);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "-10" } });
      expect(input.value).toBe("0");
    });
  });

  describe("total percentage", () => {
    it("shows total percentage indicator when tags are selected", () => {
      render(<CheckInModal {...defaultProps} />);
      const checkbox = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(checkbox);
      expect(screen.getByTestId("total-percentage")).toBeInTheDocument();
    });

    it("shows warning when total is not 100%", () => {
      render(<CheckInModal {...defaultProps} />);
      const cb1 = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(cb1);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "50" } });
      expect(screen.getByText(/must be 100%/i)).toBeInTheDocument();
    });

    it("shows green total when total is exactly 100%", () => {
      render(<CheckInModal {...defaultProps} />);
      const cb1 = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(cb1);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "100" } });
      expect(screen.getByText("Total: 100%")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("shows error when submitting with no tags selected", () => {
      render(<CheckInModal {...defaultProps} onCheckIn={vi.fn()} />);
      const submit = screen.getByTestId("check-in-submit");
      // Submit button should be disabled when not complete
      expect(submit).toBeDisabled();
    });

    it("shows error when submitting with incomplete percentage", () => {
      render(<CheckInModal {...defaultProps} onCheckIn={vi.fn()} />);
      const cb1 = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(cb1);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "50" } });
      const submit = screen.getByTestId("check-in-submit");
      expect(submit).toBeDisabled();
      expect(screen.getByText(/must be 100%/i)).toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("calls onCheckIn with correct data when valid", () => {
      const onCheckIn = vi.fn();
      render(<CheckInModal {...defaultProps} onCheckIn={onCheckIn} />);

      const cb1 = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(cb1);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "100" } });

      const submit = screen.getByTestId("check-in-submit");
      expect(submit).not.toBeDisabled();
      fireEvent.click(submit);

      expect(onCheckIn).toHaveBeenCalledTimes(1);
      const data = onCheckIn.mock.calls[0][0];
      expect(data.sessionId).toBe("session-1");
      expect(data.tags).toHaveLength(1);
      expect(data.tags[0]).toEqual({ tagId: "tag-1", percentage: 100 });
    });

    it("calls onCheckIn with note when provided", () => {
      const onCheckIn = vi.fn();
      render(<CheckInModal {...defaultProps} onCheckIn={onCheckIn} />);

      const cb1 = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(cb1);
      const input = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "100" } });

      const note = screen.getByTestId("check-in-note");
      fireEvent.change(note, { target: { value: "Working on feature X" } });

      fireEvent.click(screen.getByTestId("check-in-submit"));
      expect(onCheckIn.mock.calls[0][0].note).toBe("Working on feature X");
    });

    it("calls onCheckIn with multiple tags and their percentages", () => {
      const onCheckIn = vi.fn();
      render(<CheckInModal {...defaultProps} onCheckIn={onCheckIn} />);

      const cb1 = screen.getByTestId("tag-checkbox-tag-1");
      fireEvent.click(cb1);
      const cb2 = screen.getByTestId("tag-checkbox-tag-2");
      fireEvent.click(cb2);

      const input1 = screen.getByTestId("tag-percentage-tag-1") as HTMLInputElement;
      fireEvent.change(input1, { target: { value: "70" } });
      const input2 = screen.getByTestId("tag-percentage-tag-2") as HTMLInputElement;
      fireEvent.change(input2, { target: { value: "30" } });

      fireEvent.click(screen.getByTestId("check-in-submit"));
      expect(onCheckIn).toHaveBeenCalledTimes(1);
      const data = onCheckIn.mock.calls[0][0];
      expect(data.tags).toHaveLength(2);
      expect(data.tags).toContainEqual({ tagId: "tag-1", percentage: 70 });
      expect(data.tags).toContainEqual({ tagId: "tag-2", percentage: 30 });
    });
  });

  describe("skip", () => {
    it("calls onSkip when skip button is clicked", () => {
      const onSkip = vi.fn();
      render(<CheckInModal {...defaultProps} onSkip={onSkip} />);

      fireEvent.click(screen.getByTestId("check-in-skip"));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe("note field", () => {
    it("renders note textarea", () => {
      render(<CheckInModal {...defaultProps} />);
      expect(screen.getByTestId("check-in-note")).toBeInTheDocument();
    });

    it("accepts note input", () => {
      render(<CheckInModal {...defaultProps} />);
      const note = screen.getByTestId("check-in-note") as HTMLTextAreaElement;
      fireEvent.change(note, { target: { value: "Focused on coding" } });
      expect(note.value).toBe("Focused on coding");
    });
  });
});
