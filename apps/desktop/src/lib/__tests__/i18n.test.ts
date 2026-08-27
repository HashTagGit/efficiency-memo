import { describe, expect, it } from "vitest";
import { currentLocaleLabel, translate } from "../i18n";

describe("i18n", () => {
  it("translates supported messages and interpolates values", () => {
    expect(translate("zh-CN", "nav.coreHour")).toBe("核心时段");
    expect(translate("zh-CN", "coreHour.intervalHint", { minutes: 30 })).toBe("每 30 分钟记录一次，暂停时间不计入。");
    expect(translate("en-US", "coreHour.historySubtitle", { minutes: 15, date: "2026-08-26" })).toBe("15 min recorded on 2026-08-26");
  });

  it("falls back to the key when a message is missing", () => {
    expect(translate("zh-CN", "missing.message")).toBe("missing.message");
  });

  it("labels the current locale instead of the locale that will be selected", () => {
    expect(currentLocaleLabel("en-US")).toBe("English");
    expect(currentLocaleLabel("zh-CN")).toBe("简体中文");
  });

  it("includes translated settings labels", () => {
    expect(translate("zh-CN", "sync.title")).toBe("同步设置");
    expect(translate("zh-CN", "sync.back")).toBe("返回工作台");
  });
});
