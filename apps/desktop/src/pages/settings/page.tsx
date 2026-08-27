import React from "react";
import { PageHeader } from "@memo/ui";
import { PALETTES, useAppearance, type Palette, type ThemeMode } from "../../lib/appearance";
import { useI18n, type Locale } from "../../lib/i18n";
import { SettingsNavigation } from "./settings-navigation";

const themeModes: ThemeMode[] = ["light", "dark", "system"];
const locales: Locale[] = ["en-US", "zh-CN"];
const paletteColors: Record<Palette, string[]> = {
  ember: ["#d6a24a", "#7ec8e3", "#8ad49f"],
  grove: ["#d6ace8", "#84d3a7", "#f0c56c"],
  tide: ["#61abc2", "#8aaee8", "#e2ba70"],
};

export function AppSettingsPage() {
  const { mode, palette, setMode, setPalette } = useAppearance();
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl" data-testid="app-settings-page">
      <PageHeader title={t("appSettings.title")} subtitle={t("appSettings.subtitle")} />
      <SettingsNavigation />

      <section className="py-6" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="text-base font-semibold text-foreground">{t("appSettings.appearance")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t("appSettings.appearanceHint")}</p>

        <div className="mt-5">
          <p className="text-sm font-medium text-foreground">{t("appSettings.mode")}</p>
          <div className="mt-2 inline-flex rounded-md border border-border bg-surface p-1" role="radiogroup" aria-label={t("appSettings.mode")}>
            {themeModes.map((value) => (
              <label key={value} className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium focus-within:ring-2 focus-within:ring-accent ${mode === value ? "bg-accent text-on-accent" : "text-foreground hover:bg-surface-strong"}`}>
                <input className="sr-only" type="radio" name="appearance-mode" value={value} checked={mode === value} onChange={() => setMode(value)} />
                {t(`appSettings.mode${value[0].toUpperCase()}${value.slice(1)}`)}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-foreground">{t("appSettings.palette")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("appSettings.palette")}>
            {PALETTES.map((value) => (
              <label
                key={value}
                className={`min-h-24 cursor-pointer rounded-md border p-4 text-left transition-[border-color,background-color,box-shadow] focus-within:ring-2 focus-within:ring-accent ${palette === value ? "border-accent bg-active shadow-sm" : "border-border bg-surface hover:bg-surface-strong"}`}
              >
                <input className="sr-only" type="radio" name="appearance-palette" value={value} checked={palette === value} onChange={() => setPalette(value)} />
                <span className="flex gap-1.5" aria-hidden="true">
                  {paletteColors[value].map((color) => <span key={color} className="h-4 flex-1 rounded-sm" style={{ backgroundColor: color }} />)}
                </span>
                <span className="mt-3 block text-sm font-semibold text-foreground">{t(`appSettings.palette${value[0].toUpperCase()}${value.slice(1)}`)}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{t(`appSettings.palette${value[0].toUpperCase()}${value.slice(1)}Hint`)}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-6" aria-labelledby="language-heading">
        <h2 id="language-heading" className="text-base font-semibold text-foreground">{t("appSettings.language")}</h2>
        <p className="mt-1 text-sm text-muted">{t("appSettings.languageHint")}</p>
        <div className="mt-4 flex gap-2" role="radiogroup" aria-label={t("appSettings.language")}>
          {locales.map((value) => (
            <label key={value} className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium focus-within:ring-2 focus-within:ring-accent ${locale === value ? "border-accent bg-accent text-on-accent" : "border-border bg-surface text-foreground hover:bg-surface-strong"}`}>
              <input className="sr-only" type="radio" name="appearance-language" value={value} checked={locale === value} onChange={() => setLocale(value)} />
              {value === "en-US" ? "English" : "简体中文"}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
