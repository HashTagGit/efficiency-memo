import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { TagsProvider, useTagsContext } from "../context";

// ---------------------------------------------------------------------------
// Mock the db module
// ---------------------------------------------------------------------------
const { mockSelect, mockExecute } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue([]),
  mockExecute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db", () => ({
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

describe("useTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty tags", () => {
    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });
    expect(result.current.tags).toEqual([]);
  });

  it("addTag appends a new tag", async () => {
    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addTag("Work", "#111827", "user-1");
    });

    await waitFor(() => {
      expect(result.current.tags).toHaveLength(1);
    });
    expect(result.current.tags[0].name).toBe("Work");
    expect(result.current.tags[0].color).toBe("#111827");
    expect(result.current.tags[0].synced).toBe(false);
    expect(result.current.tags[0].is_archived).toBe(false);
  });

  it("addTag writes to the database", async () => {
    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addTag("Break", "#3b82f6", "user-1");
    });

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it("archiveTag marks tag as archived", async () => {
    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addTag("Break", "#3b82f6", "user-1");
    });
    await waitFor(() => {
      expect(result.current.tags).toHaveLength(1);
    });

    const id = result.current.tags[0].id;
    await act(async () => {
      await result.current.archiveTag(id);
    });

    await waitFor(() => {
      expect(result.current.tags[0].is_archived).toBe(true);
    });
    expect(result.current.tags[0].synced).toBe(false);
  });

  it("renameTag updates tag name", async () => {
    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addTag("Old Name", "#111827", "user-1");
    });
    await waitFor(() => {
      expect(result.current.tags).toHaveLength(1);
    });

    const id = result.current.tags[0].id;
    await act(async () => {
      await result.current.renameTag(id, "New Name");
    });

    await waitFor(() => {
      expect(result.current.tags[0].name).toBe("New Name");
    });
    expect(result.current.tags[0].synced).toBe(false);
  });

  it("activeTags returns only non-archived tags", async () => {
    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addTag("Work", "#111827", "user-1");
      await result.current.addTag("Break", "#3b82f6", "user-1");
    });
    await waitFor(() => {
      expect(result.current.tags).toHaveLength(2);
    });

    const id = result.current.tags[0].id;
    await act(async () => {
      await result.current.archiveTag(id);
    });

    await waitFor(() => {
      const active = result.current.activeTags();
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe("Break");
    });
  });

  it("loadTags populates the tag list", async () => {
    const tagRow = {
      id: "t1",
      user_id: "user-1",
      name: "Deep Work",
      color: "#22c55e",
      is_archived: 0,
      created_at: "2026-06-01T12:00:00.000Z",
      synced: 1,
    };
    mockSelect.mockResolvedValueOnce([tagRow]);

    const { result } = renderHook(() => useTagsContext(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.loadTags("user-1");
    });

    await waitFor(() => {
      expect(result.current.tags).toHaveLength(1);
    });
    expect(result.current.tags[0].name).toBe("Deep Work");
    expect(result.current.tags[0].is_archived).toBe(false);
    expect(result.current.tags[0].synced).toBe(true);
  });
});
