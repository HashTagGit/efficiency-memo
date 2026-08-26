"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shell } from "@memo/ui";
import type { ToolManifest } from "@memo/shared";
import { getRegisteredTools } from "../lib/tool-registry/registry";

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
    name: tool.name,
    icon: tool.icon,
    description: tool.description,
    routes: tool.routes,
    enabled: tool.enabled,
  }));

  // Append Settings as a synthetic tool in the sidebar
  const allManifests: ToolManifest[] = [
    ...toolManifests,
    {
      id: "settings",
      name: "Settings",
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
    >
      {children}
    </Shell>
  );
}
