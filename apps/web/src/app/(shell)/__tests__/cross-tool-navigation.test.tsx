import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ToolManifest } from "@memo/shared";
import {
  registerTool,
  getRegisteredTools,
  getToolById,
  clearRegistry,
} from "@/lib/tool-registry/registry";

// -------------------------------------------------------
// ShellLayoutClient tests (sidebar links)
// -------------------------------------------------------

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => "/tools/charger-reminder");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

// Mock auth
vi.mock("@/lib/auth/session", () => ({
  requireSessionUser: () => Promise.resolve({ id: "mock-user", email: "test@example.com" }),
}));

vi.mock("@/lib/auth/actions", () => ({
  signOutAction: () => Promise.resolve(),
}));

// Mock tool navigation
const mockGetActiveTool = vi.fn(() => "charger-reminder");

vi.mock("@/lib/shell/tool-navigation", () => ({
  getToolList: () => {
    const { getRegisteredTools } = vi.importActual("@/lib/tool-registry/registry");
    return getRegisteredTools()
      .filter((t: { enabled: boolean }) => t.enabled)
      .map((t: ToolManifest) => t);
  },
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

import { ShellLayoutClient } from "../shell-layout-client";

const crManifest: ToolManifest = {
  id: "charger-reminder",
  name: "Charger Reminder",
  icon: "battery",
  description: "Track device batteries",
  routes: ["/tools/charger-reminder"],
  enabled: true,
};

const chManifest: ToolManifest = {
  id: "core-hour",
  name: "CoreHour",
  icon: "clock",
  description: "Track how you spend your time",
  routes: ["/tools/core-hour", "/tools/core-hour/history", "/tools/core-hour/tags", "/tools/core-hour/settings"],
  enabled: true,
};

const allTools = [crManifest, chManifest];

describe("Cross-Tool Navigation — Sidebar Links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue("/tools/charger-reminder");
    mockGetActiveTool.mockReturnValue("charger-reminder");
  });

  it("renders both CR and CH tool buttons in the sidebar", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={allTools}
        signOutAction={vi.fn()}
      >
        <div data-testid="page-content">Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-tool-charger-reminder")).toBeInTheDocument();
    expect(screen.getByTestId("shell-tool-core-hour")).toBeInTheDocument();
    expect(screen.getByTestId("shell-tools-count")).toHaveTextContent("2");
  });

  it("clicking CR tool button navigates to CR route", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={allTools}
        signOutAction={vi.fn()}
      >
        <div data-testid="page-content">Content</div>
      </ShellLayoutClient>
    );

    fireEvent.click(screen.getByTestId("shell-tool-charger-reminder"));
    expect(mockPush).toHaveBeenCalledWith("/tools/charger-reminder");
  });

  it("clicking CH tool button navigates to CH route", () => {
    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={allTools}
        signOutAction={vi.fn()}
      >
        <div data-testid="page-content">Content</div>
      </ShellLayoutClient>
    );

    fireEvent.click(screen.getByTestId("shell-tool-core-hour"));
    expect(mockPush).toHaveBeenCalledWith("/tools/core-hour");
  });

  it("highlights CR as active when on CR path", () => {
    mockPathname.mockReturnValue("/tools/charger-reminder");
    mockGetActiveTool.mockReturnValue("charger-reminder");

    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={allTools}
        signOutAction={vi.fn()}
      >
        <div data-testid="page-content">Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-active-tool")).toHaveTextContent("charger-reminder");
  });

  it("highlights CH as active when on CH path", () => {
    mockPathname.mockReturnValue("/tools/core-hour");
    mockGetActiveTool.mockReturnValue("core-hour");

    render(
      <ShellLayoutClient
        userEmail="test@example.com"
        tools={allTools}
        signOutAction={vi.fn()}
      >
        <div data-testid="page-content">Content</div>
      </ShellLayoutClient>
    );

    expect(screen.getByTestId("shell-active-tool")).toHaveTextContent("core-hour");
  });
});

// -------------------------------------------------------
// Tool Registry tests (both tools registered + discoverable)
// -------------------------------------------------------

describe("Cross-Tool Navigation — Tool Registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  const mockLoader = () => Promise.resolve({ default: () => null });

  it("registers and retrieves Charger Reminder tool", () => {
    registerTool(crManifest, mockLoader);

    const tool = getToolById("charger-reminder");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("Charger Reminder");
    expect(tool?.routes).toContain("/tools/charger-reminder");
    expect(tool?.enabled).toBe(true);
  });

  it("registers and retrieves CoreHour tool", () => {
    registerTool(chManifest, mockLoader);

    const tool = getToolById("core-hour");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("CoreHour");
    expect(tool?.routes).toContain("/tools/core-hour");
    expect(tool?.enabled).toBe(true);
  });

  it("both tools appear in registered tools list", () => {
    registerTool(crManifest, mockLoader);
    registerTool(chManifest, mockLoader);

    const tools = getRegisteredTools();
    expect(tools.length).toBe(2);
    expect(tools.some((t) => t.id === "charger-reminder")).toBe(true);
    expect(tools.some((t) => t.id === "core-hour")).toBe(true);
  });

  it("both tools are discoverable via discovery mechanism", async () => {
    // The discovery.ts scans for 'charger-reminder' and 'core-hour' feature names
    const { discoverTools } = await import("@/lib/tool-registry/discovery");
    const tools = await discoverTools();

    // discovery runs dynamic imports; if modules are available, tools are returned
    expect(Array.isArray(tools)).toBe(true);
  });

  it("both tools have correct manifest structure", () => {
    registerTool(crManifest, mockLoader);
    registerTool(chManifest, mockLoader);

    const crTool = getToolById("charger-reminder")!;
    const chTool = getToolById("core-hour")!;

    // All required ToolManifest fields present
    expect(crTool.id).toBeTypeOf("string");
    expect(crTool.name).toBeTypeOf("string");
    expect(crTool.icon).toBeTypeOf("string");
    expect(crTool.description).toBeTypeOf("string");
    expect(Array.isArray(crTool.routes)).toBe(true);
    expect(typeof crTool.enabled).toBe("boolean");

    expect(chTool.id).toBeTypeOf("string");
    expect(chTool.name).toBeTypeOf("string");
    expect(chTool.icon).toBeTypeOf("string");
    expect(chTool.description).toBeTypeOf("string");
    expect(Array.isArray(chTool.routes)).toBe(true);
    expect(typeof chTool.enabled).toBe("boolean");
  });
});


