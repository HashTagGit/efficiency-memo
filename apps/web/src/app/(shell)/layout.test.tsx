import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ToolManifest } from "@memo/shared";

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => "/tools/tool-a");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

// Mock auth session
const mockRequireSessionUser = vi.fn();
const mockSignOutAction = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: () => mockRequireSessionUser(),
}));

vi.mock("@/lib/auth/actions", () => ({
  signOutAction: () => mockSignOutAction(),
}));

// Mock tool navigation
const mockGetToolList = vi.fn(() => []);
const mockGetActiveTool = vi.fn(() => "");

vi.mock("@/lib/shell/tool-navigation", () => ({
  getToolList: () => mockGetToolList(),
  getActiveTool: (pathname: string) => mockGetActiveTool(pathname),
}));

// Mock @memo/ui Shell
vi.mock("@memo/ui", () => ({
  Shell: ({
    tools,
    activeToolId,
    onToolSelect,
    isCollapsed,
    onToggle,
    userEmail,
    onSignOut,
    children,
  }: {
    tools: ToolManifest[];
    activeToolId: string;
    onToolSelect: (id: string) => void;
    isCollapsed: boolean;
    onToggle: () => void;
    userEmail: string;
    onSignOut: () => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="shell-mock">
      <div data-testid="shell-user-email">{userEmail}</div>
      <div data-testid="shell-tools-count">{tools.length}</div>
      <div data-testid="shell-active-tool">{activeToolId || "none"}</div>
      <div data-testid="shell-collapsed">{isCollapsed ? "true" : "false"}</div>
      <button data-testid="shell-toggle" onClick={onToggle}>Toggle</button>
      <button data-testid="shell-signout" onClick={onSignOut}>Sign Out</button>
      <div data-testid="shell-children">{children}</div>
      <div data-testid="shell-tool-list">
        {tools.map((tool) => (
          <button
            key={tool.id}
            data-testid={`shell-tool-${tool.id}`}
            onClick={() => onToolSelect(tool.id)}
          >
            {tool.name}
          </button>
        ))}
      </div>
    </div>
  ),
}));

// We need to test the client component directly since the layout is async server component
import { ShellLayoutClient } from "./shell-layout-client";

const mockTools: ToolManifest[] = [
  {
    id: "tool-a",
    name: "Tool A",
    icon: "icon-a",
    description: "Desc A",
    routes: ["/tools/tool-a"],
    enabled: true,
  },
  {
    id: "tool-b",
    name: "Tool B",
    icon: "icon-b",
    description: "Desc B",
    routes: ["/tools/tool-b"],
    enabled: true,
  },
];

describe("ShellLayoutClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/tools/tool-a");
    mockGetActiveTool.mockReturnValue("tool-a");
  });

  it("renders Shell with user email", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-mock")).toBeInTheDocument();
    expect(screen.getByTestId("shell-user-email")).toHaveTextContent("test@example.com");
  });

  it("passes tools to Shell", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-tools-count")).toHaveTextContent("2");
    expect(screen.getByTestId("shell-tool-tool-a")).toBeInTheDocument();
    expect(screen.getByTestId("shell-tool-tool-b")).toBeInTheDocument();
  });

  it("passes activeToolId based on pathname", () => {
    mockPathname.mockReturnValue("/tools/tool-b");
    mockGetActiveTool.mockReturnValue("tool-b");

    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-active-tool")).toHaveTextContent("tool-b");
  });

  it("renders children content", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-children")).toContainElement(
      screen.getByTestId("page-content")
    );
  });

  it("calls signOutAction when sign out is triggered", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    fireEvent.click(screen.getByTestId("shell-signout"));
    expect(mockSignOutAction).toHaveBeenCalledTimes(1);
  });

  it("toggles sidebar collapse state", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-collapsed")).toHaveTextContent("false");

    fireEvent.click(screen.getByTestId("shell-toggle"));
    expect(screen.getByTestId("shell-collapsed")).toHaveTextContent("true");

    fireEvent.click(screen.getByTestId("shell-toggle"));
    expect(screen.getByTestId("shell-collapsed")).toHaveTextContent("false");
  });

  it("navigates to tool route when tool is selected", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    fireEvent.click(screen.getByTestId("shell-tool-tool-b"));
    expect(mockPush).toHaveBeenCalledWith("/tools/tool-b");
  });

  it("shows empty active tool when pathname does not match", () => {
    mockPathname.mockReturnValue("/dashboard");
    mockGetActiveTool.mockReturnValue("");

    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={mockTools}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-active-tool")).toHaveTextContent("none");
  });

  it("handles empty tools array", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={[]}
        signOutAction={mockSignOutAction}
      >
        <div data-testid="page-content">Page Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-tools-count")).toHaveTextContent("0");
  });
});

describe("ShellLayout (server)", () => {
  it("redirects unauthenticated users to /sign-in", async () => {
    // Mock requireSessionUser to throw (simulating redirect)
    mockRequireSessionUser.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    let threw = false;
    try {
      const ShellLayout = (await import("./layout")).default;
      await ShellLayout({ children: <div>Test</div> });
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
  });
});
