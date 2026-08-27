import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const PALETTES = ["ember", "grove", "tide"] as const;
export const DEFAULT_PALETTE: Palette = "ember";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type Palette = (typeof PALETTES)[number];

const THEME_MODE_KEY = "efficiency-memo-theme-mode";
const LEGACY_THEME_KEY = "efficiency-memo-theme";
const PALETTE_KEY = "efficiency-memo-palette";

export function resolveTheme(mode: ThemeMode, systemDark: boolean): ResolvedTheme {
  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

export function readThemeMode(stored: string | null, legacy: string | null): ThemeMode {
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

export function readPalette(stored: string | null): Palette {
  return PALETTES.includes(stored as Palette) ? stored as Palette : DEFAULT_PALETTE;
}

export function initializeAppearance(): void {
  if (typeof window === "undefined") return;
  const mode = readThemeMode(
    window.localStorage.getItem(THEME_MODE_KEY),
    window.localStorage.getItem(LEGACY_THEME_KEY),
  );
  const palette = readPalette(window.localStorage.getItem(PALETTE_KEY));
  const theme = resolveTheme(mode, systemPrefersDark());
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.palette = palette;
  document.documentElement.style.colorScheme = theme;
}

interface AppearanceContextValue {
  mode: ThemeMode;
  theme: ResolvedTheme;
  palette: Palette;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: Palette) => void;
  toggleTheme: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => readThemeMode(
    typeof window === "undefined" ? null : window.localStorage.getItem(THEME_MODE_KEY),
    typeof window === "undefined" ? null : window.localStorage.getItem(LEGACY_THEME_KEY),
  ));
  const [palette, setPalette] = useState<Palette>(() => readPalette(
    typeof window === "undefined" ? null : window.localStorage.getItem(PALETTE_KEY),
  ));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const theme = resolveTheme(mode, systemDark);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_MODE_KEY, mode);
    window.localStorage.setItem(PALETTE_KEY, palette);
    window.localStorage.setItem(LEGACY_THEME_KEY, theme);
  }, [mode, palette, theme]);

  const toggleTheme = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark");
  }, [theme]);

  const value = useMemo<AppearanceContextValue>(() => ({
    mode,
    theme,
    palette,
    setMode,
    setPalette,
    toggleTheme,
  }), [mode, palette, theme, toggleTheme]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used within AppearanceProvider");
  return context;
}
