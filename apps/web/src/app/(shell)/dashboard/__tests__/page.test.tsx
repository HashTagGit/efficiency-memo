import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";
import {
  registerTool,
  clearRegistry,
} from "@/lib/tool-registry/registry";
import type { ToolManifest } from "@memo/shared";

// Mock next/navigation and next/link to avoid router context issues
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockManifest: ToolManifest = {
  id: "test-tool",
  name: "Test Tool",
  icon: "test-icon",
  description: "A test tool for the dashboard",
  routes: ["/tools/test-tool"],
  enabled: true,
};

const mockLoader = () => Promise.resolve({ default: () => null });

describe("DashboardPage", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("renders empty state when no tools are registered", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId("dashboard-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No tools available yet")).toBeInTheDocument();
  });

  it("renders tool cards when tools are registered", async () => {
    registerTool(mockManifest, mockLoader);

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId("dashboard-tool-grid")).toBeInTheDocument();
    expect(
      screen.getByTestId(`dashboard-tool-card-${mockManifest.id}`)
    ).toBeInTheDocument();
    expect(screen.getByText(mockManifest.name)).toBeInTheDocument();
    expect(screen.getByText(mockManifest.description)).toBeInTheDocument();
  });

  it("card links to the correct tool route", async () => {
    registerTool(mockManifest, mockLoader);

    const jsx = await DashboardPage();
    render(jsx);

    const card = screen.getByTestId(`dashboard-tool-card-${mockManifest.id}`);
    expect(card).toHaveAttribute("href", `/tools/${mockManifest.id}`);
  });

  it("does not render disabled tools", async () => {
    registerTool(
      { ...mockManifest, id: "disabled-tool", enabled: false },
      mockLoader
    );

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.queryByTestId("dashboard-tool-grid")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-empty-state")).toBeInTheDocument();
  });
});
