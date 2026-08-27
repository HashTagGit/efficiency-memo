import { describe, expect, it } from "vitest";
import {
  PALETTE_KEY,
  THEME_MODE_KEY,
} from "../appearance";
import { applyPortablePreferences } from "../data-control";
import { humanExportFilename, serializeHumanExport } from "../human-export";
import { LOCALE_KEY } from "../i18n";

describe("portable data helpers", () => {
  it("applies only stable portable preferences", () => {
    const values = new Map<string, string>();
    applyPortablePreferences(
      { locale: "zh-CN", themeMode: "dark", palette: "tide" },
      { setItem: (key, value) => values.set(key, value) },
    );
    expect(Object.fromEntries(values)).toEqual({
      [LOCALE_KEY]: "zh-CN",
      [THEME_MODE_KEY]: "dark",
      [PALETTE_KEY]: "tide",
    });
  });

  it("marks human exports as non-restorable", () => {
    const document = JSON.parse(serializeHumanExport(
      "core-hour",
      { sessions: [{ id: "session-1" }] },
      "2026-08-28T10:00:00.000Z",
    ));
    expect(document).toMatchObject({
      format: "efficiency-memo-human-export",
      version: 1,
      module: "core-hour",
      restorable: false,
    });
    expect(humanExportFilename("core-hour", new Date("2026-08-28T10:00:00.000Z")))
      .toBe("EfficiencyMemo-core-hour-2026-08-28.json");
  });
});
