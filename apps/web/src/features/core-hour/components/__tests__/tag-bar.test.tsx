import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TagsProvider } from "../../hooks/context";
import { TagBar } from "../tag-bar";

// ---------------------------------------------------------------------------
// Mock the db module used by TagsProvider
// ---------------------------------------------------------------------------
const { mockSelect, mockExecute } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue([]),
  mockExecute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../hooks/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    execute: mockExecute,
  }),
}));

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------
function Wrapper({ children }: { children: React.ReactNode }) {
  return <TagsProvider>{children}</TagsProvider>;
}

describe("TagBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no tags exist", () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    expect(screen.getByTestId("tag-bar")).toBeInTheDocument();
    expect(screen.getByText("No tags yet. Add one below.")).toBeInTheDocument();
    expect(screen.getByTestId("tag-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("add-tag-button")).toBeInTheDocument();
  });

  it("adds a tag when form is submitted", async () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Work" } });

    fireEvent.click(screen.getByTestId("add-tag-button"));

    await waitFor(() => {
      expect(screen.getByTestId("tag-Work")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tag-Work")).toHaveTextContent("Work");
    expect(screen.queryByText("No tags yet. Add one below.")).not.toBeInTheDocument();
  });

  it("adds a tag via Enter key", async () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "Break" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByTestId("tag-Break")).toBeInTheDocument();
    });
  });

  it("does not add empty tag", () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    const button = screen.getByTestId("add-tag-button");
    expect(button).toBeDisabled();

    const input = screen.getByTestId("tag-name-input");
    fireEvent.change(input, { target: { value: "   " } });
    expect(button).toBeDisabled();
  });

  it("archives a tag when remove button is clicked", async () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    // Add a tag first
    fireEvent.change(screen.getByTestId("tag-name-input"), {
      target: { value: "Work" },
    });
    fireEvent.click(screen.getByTestId("add-tag-button"));

    await waitFor(() => {
      expect(screen.getByTestId("tag-Work")).toBeInTheDocument();
    });

    // Archive it
    fireEvent.click(screen.getByTestId("remove-tag-Work"));

    await waitFor(() => {
      expect(screen.queryByTestId("tag-Work")).not.toBeInTheDocument();
    });
    expect(screen.getByText("No tags yet. Add one below.")).toBeInTheDocument();
  });

  it("renders tag with color indicator", async () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    fireEvent.change(screen.getByTestId("tag-name-input"), {
      target: { value: "DeepWork" },
    });
    fireEvent.click(screen.getByTestId("add-tag-button"));

    await waitFor(() => {
      expect(screen.getByTestId("tag-DeepWork")).toBeInTheDocument();
    });

    const tag = screen.getByTestId("tag-DeepWork");
    // jsdom converts hex to rgb; check for the rgb equivalent
    expect(tag.getAttribute("style")).toContain("rgb(59, 130, 246)");
  });

  it("renders color picker for tag color selection", () => {
    render(<TagBar userId="user-1" />, { wrapper: Wrapper });

    const colorInput = screen.getByTestId("tag-color-input");
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveAttribute("type", "color");
  });
});
