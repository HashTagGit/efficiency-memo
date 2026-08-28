// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../lib/i18n";
import { ShellLayout } from "../shell-layout";

vi.mock("@memo/ui", async () => {
  const ReactModule = await import("react");
  return {
    Shell: ({ tools, onToolSelect, labels, children }: {
      tools: Array<{ id: string; name: string }>;
      onToolSelect: (id: string) => void;
      labels?: { openHome?: string };
      children: React.ReactNode;
    }) => ReactModule.createElement(
      "div",
      null,
      labels?.openHome && ReactModule.createElement(
        "button",
        { type: "button", onClick: () => onToolSelect("home") },
        "Now",
      ),
      ...tools.map((tool) => ReactModule.createElement(
        "button",
        { key: tool.id, type: "button", onClick: () => onToolSelect(tool.id) },
        tool.name,
      )),
      children,
    ),
  };
});

vi.mock("../../lib/appearance", () => ({
  useAppearance: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("../../lib/tool-registry/registry", () => ({
  getRegisteredTools: () => [{
    id: "core-hour",
    name: "CoreHour",
    icon: "clock",
    description: "Focus workflow",
    routes: ["/tools/core-hour"],
    enabled: true,
  }],
}));

describe("Shell workspace navigation", () => {
  it("returns to the initial Now workspace after opening a tool", () => {
    render(
      <MemoryRouter initialEntries={["/tools/core-hour"]}>
        <I18nProvider initialLocale="en-US">
          <ShellLayout>
            <Routes>
              <Route path="/dashboard" element={<p>Initial workspace</p>} />
              <Route path="/tools/core-hour" element={<p>CoreHour workspace</p>} />
            </Routes>
          </ShellLayout>
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("CoreHour workspace")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Now" }));
    expect(screen.getByText("Initial workspace")).toBeTruthy();
  });
});
