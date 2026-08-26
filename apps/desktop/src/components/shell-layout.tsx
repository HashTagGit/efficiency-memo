"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shell } from "@memo/ui";
import type { ToolManifest } from "@memo/shared";
import { getRegisteredTools } from "../lib/tool-registry/registry";
import { currentLocaleLabel, useI18n } from "../lib/i18n";

function getActiveToolId(pathname: string): string {
  const toolMatch = pathname.match(/^\/tools\/([^/]+)/);
  if (toolMatch) return toolMatch[1];
  if (pathname.startsWith("/settings")) return "settings";
  return "";
}

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { locale, toggleLocale, t } = useI18n();

  const tools = getRegisteredTools().filter((tool) => tool.enabled);
  const activeToolId = getActiveToolId(location.pathname);

  const handleToolSelect = (toolId: string) => {
    if (toolId === "settings") {
      navigate("/settings/sync");
      return;
    }
    const tool = tools.find((t) => t.id === toolId);
    if (tool?.routes[0]) {
      navigate(tool.routes[0]);
    }
  };

  // Convert RegisteredTool[] to ToolManifest[] for Shell
  const toolManifests: ToolManifest[] = tools.map((tool) => ({
    id: tool.id,
    name: tool.id === "core-hour" ? t("nav.coreHour") : tool.name,
    icon: tool.icon,
    description: tool.id === "core-hour" ? t("nav.coreHourDescription") : tool.description,
    routes: tool.routes,
    enabled: tool.enabled,
  }));

  // Append Settings as a synthetic tool in the sidebar
  const allManifests: ToolManifest[] = [
    ...toolManifests,
    {
      id: "settings",
      name: t("nav.settings"),
      icon: "settings",
      description: "Sync and app settings",
      routes: ["/settings/sync"],
      enabled: true,
    },
  ];

  return (
    <Shell
      tools={allManifests}
      activeToolId={activeToolId}
      onToolSelect={handleToolSelect}
      isCollapsed={isCollapsed}
      onToggle={() => setIsCollapsed((prev) => !prev)}
      labels={{
        appName: t("app.name"),
        tools: t("nav.tools"),
        settings: t("nav.settings"),
        lightMode: t("nav.lightMode"),
        darkMode: t("nav.darkMode"),
        switchToLight: t("nav.switchToLight"),
        switchToDark: t("nav.switchToDark"),
        collapseSidebar: t("nav.collapseSidebar"),
        expandSidebar: t("nav.expandSidebar"),
        language: t("nav.language"),
      }}
      localeLabel={currentLocaleLabel(locale)}
      localeAriaLabel={t("nav.switchLanguage")}
      onLocaleToggle={toggleLocale}
    >
      {children}
    </Shell>
  );
}
