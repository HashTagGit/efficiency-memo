import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../../lib/i18n";
import { SyncSettingsPage } from "../page";

describe("SyncSettingsPage", () => {
  it("provides a direct way back to the dashboard in both supported locales", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/settings/sync"]}>
        <I18nProvider initialLocale="en-US">
          <Routes>
            <Route path="/settings/sync" element={<SyncSettingsPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("Sync Settings");

    const chineseMarkup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/settings/sync"]}>
        <I18nProvider initialLocale="zh-CN">
          <Routes>
            <Route path="/settings/sync" element={<SyncSettingsPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(chineseMarkup).toContain("返回工作台");
    expect(chineseMarkup).toContain("同步设置");
  });
});
