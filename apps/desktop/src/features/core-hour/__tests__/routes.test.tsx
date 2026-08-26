import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import CoreHourRoutes from "../pages/dashboard-page";

vi.mock("../../../lib/auth", () => ({
  getCurrentUser: () => ({
    id: "local-user",
    email: "local@efficiency-memo",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }),
}));

describe("CoreHour navigation", () => {
  it("keeps every tab anchored to the CoreHour route after switching tabs", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/tools/core-hour/history"]}>
        <Routes>
          <Route path="/tools/core-hour/*" element={<CoreHourRoutes />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(markup).toContain('href="/tools/core-hour"');
    expect(markup).toContain('href="/tools/core-hour/history"');
    expect(markup).toContain('href="/tools/core-hour/tags"');
    expect(markup).toContain('href="/tools/core-hour/settings"');
  });
});
