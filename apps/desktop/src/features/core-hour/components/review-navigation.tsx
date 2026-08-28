import React from "react";
import { NavLink } from "react-router-dom";
import { useI18n } from "../../../lib/i18n";

export function ReviewNavigation() {
  const { t } = useI18n();
  const items = [
    { to: "/tools/core-hour/review", end: true, label: t("dailyReview.title") },
    { to: "/tools/core-hour/review/week", end: false, label: t("weeklyReview.title") },
  ];
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-3" aria-label={t("dailyReview.reviewViews")}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `flex h-9 items-center rounded-md px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${isActive ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
