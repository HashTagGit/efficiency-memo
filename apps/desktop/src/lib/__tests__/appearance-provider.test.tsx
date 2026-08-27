// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppearanceProvider,
  initializeAppearance,
} from "../appearance";

describe("AppearanceProvider", () => {
  let systemDark = false;
  let listeners: Set<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    systemDark = false;
    localStorage.clear();
    listeners = new Set();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        get matches() { return systemDark; },
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      })),
    });
  });

  it("applies stored appearance before React mounts", () => {
    localStorage.setItem("efficiency-memo-theme-mode", "light");
    localStorage.setItem("efficiency-memo-palette", "grove");

    initializeAppearance();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.palette).toBe("grove");
  });

  it("follows system changes and removes its listener", () => {
    localStorage.setItem("efficiency-memo-theme-mode", "system");
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => root.render(<AppearanceProvider><span /></AppearanceProvider>));
    expect(document.documentElement.dataset.theme).toBe("light");

    systemDark = true;
    act(() => listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
    expect(document.documentElement.dataset.theme).toBe("dark");

    act(() => root.unmount());
    expect(listeners.size).toBe(0);
  });
});
