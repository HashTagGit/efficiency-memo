import React from "react";
import { NavLink } from "react-router-dom";
import { useI18n } from "../../lib/i18n";

export function SettingsNavigation() {
  const { t } = useI18n();
  const items = [
    { to: "/settings", end: true, label: t("appSettings.appearance") },
    { to: "/settings/data", end: false, label: t("dataPrivacy.title") },
  ];

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-border pb-3"
      aria-label={t("appSettings.navigation")}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (
            "flex h-9 items-center rounded-md px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring "
            + (isActive
              ? "bg-accent text-on-accent"
              : "text-muted hover:bg-surface hover:text-foreground")
          )}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
