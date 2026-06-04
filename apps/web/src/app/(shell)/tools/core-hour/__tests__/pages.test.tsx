import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock useTimer (used by Dashboard component)
// ---------------------------------------------------------------------------
const mockTimer = vi.hoisted(() => ({
  elapsed: 0,
  isRunning: false,
  isPaused: false,
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}));

vi.mock("@/features/core-hour/hooks/use-timer", () => ({
  useTimer: () => mockTimer,
}));

// ---------------------------------------------------------------------------
// Mock the db module (used by SessionProvider, TagsProvider, useHistory)
// ---------------------------------------------------------------------------
const { mockSelect, mockExecute } = vi.hoisted(() => ({
  mockSelect: vi.fn().mockResolvedValue([]),
  mockExecute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/core-hour/hooks/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    execute: mockExecute,
  }),
}));

// ---------------------------------------------------------------------------
// Page imports (must be after mocks)
// ---------------------------------------------------------------------------
import CoreHourDashboardPage from "../page";
import CoreHourHistoryPage from "../history/page";
import CoreHourTagsPage from "../tags/page";
import CoreHourSettingsPage from "../settings/page";

describe("CoreHour Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimer.elapsed = 0;
    mockTimer.isRunning = false;
    mockTimer.isPaused = false;
  });

  it("renders the Dashboard component", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourDashboardPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-dashboard")).toBeInTheDocument();
  });

  it("renders the TagBar component", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourDashboardPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-tag-bar")).toBeInTheDocument();
  });

  it("shows the CoreHour title", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourDashboardPage();
    });
    render(jsx!);

    expect(screen.getByText("CoreHour")).toBeInTheDocument();
  });

  it("displays both Dashboard and TagBar in a grid layout", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourDashboardPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("ch-tag-bar")).toBeInTheDocument();
  });
});

describe("CoreHour History Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourHistoryPage();
    });
    render(jsx!);

    expect(screen.getByText("Session History")).toBeInTheDocument();
  });

  it("renders loading state initially", async () => {
    let resolvePromise!: (value: unknown) => void;
    mockSelect.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourHistoryPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-history-loading")).toBeInTheDocument();

    await act(async () => {
      resolvePromise([]);
    });
  });

  it("renders empty state when no sessions exist", async () => {
    mockSelect.mockResolvedValueOnce([]);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourHistoryPage();
    });
    render(jsx!);

    await waitFor(() => {
      expect(screen.getByTestId("ch-history-empty")).toBeInTheDocument();
    });
  });

  it("renders session list when sessions exist", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: "session-1",
        user_id: "user-1",
        started_at: "2026-06-01T10:00:00.000Z",
        ended_at: "2026-06-01T12:00:00.000Z",
        interval_minutes: 30,
        synced: 1,
      },
      {
        id: "session-2",
        user_id: "user-1",
        started_at: "2026-06-02T14:00:00.000Z",
        ended_at: "2026-06-02T15:30:00.000Z",
        interval_minutes: 30,
        synced: 1,
      },
    ]);

    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourHistoryPage();
    });
    render(jsx!);

    await waitFor(() => {
      expect(screen.getByTestId("ch-history-list")).toBeInTheDocument();
    });
    expect(screen.getByTestId("ch-session-session-1")).toBeInTheDocument();
    expect(screen.getByTestId("ch-session-session-2")).toBeInTheDocument();
  });
});

describe("CoreHour Tags Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourTagsPage();
    });
    render(jsx!);

    expect(screen.getByText("Tag Management")).toBeInTheDocument();
  });

  it("renders the TagsPage component", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourTagsPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-tags-page")).toBeInTheDocument();
  });

  it("renders the new tag creation form", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourTagsPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-new-tag-name")).toBeInTheDocument();
    expect(screen.getByTestId("ch-new-tag-color")).toBeInTheDocument();
    expect(screen.getByTestId("ch-create-tag")).toBeInTheDocument();
  });

  it("shows empty state when no tags exist", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourTagsPage();
    });
    render(jsx!);

    await waitFor(() => {
      expect(
        screen.getByText("No tags yet. Create your first tag above."),
      ).toBeInTheDocument();
    });
  });
});

describe("CoreHour Settings Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourSettingsPage();
    });
    render(jsx!);

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders the SettingsPage component", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourSettingsPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-settings-page")).toBeInTheDocument();
  });

  it("renders interval options", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourSettingsPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-interval-30")).toBeInTheDocument();
    expect(screen.getByTestId("ch-interval-60")).toBeInTheDocument();
  });

  it("renders save button", async () => {
    let jsx: React.ReactElement;
    await act(async () => {
      jsx = CoreHourSettingsPage();
    });
    render(jsx!);

    expect(screen.getByTestId("ch-save-settings")).toBeInTheDocument();
  });
});
