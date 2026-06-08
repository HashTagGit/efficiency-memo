"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shell } from "@memo/ui";
import type { ToolManifest } from "@memo/shared";
import { getCurrentUser, signOut } from "../lib/auth";
import { getRegisteredTools } from "../lib/tool-registry/registry";

function getActiveToolId(pathname: string): string {
  const match = pathname.match(/^\/tools\/([^\/]+)/);
  return match ? match[1] : "";
}

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/sign-in", { replace: true });
      return;
    }
    setUserEmail(user.email);
  }, [navigate]);

  const tools = getRegisteredTools().filter((tool) => tool.enabled);
  const activeToolId = getActiveToolId(location.pathname);

  const handleToolSelect = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (tool?.routes[0]) {
      navigate(tool.routes[0]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in", { replace: true });
  };

  // Still checking auth - render nothing or minimal loading state
  if (userEmail === null) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Convert RegisteredTool[] to ToolManifest[] for Shell
  const toolManifests: ToolManifest[] = tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    icon: tool.icon,
    description: tool.description,
    routes: tool.routes,
    enabled: tool.enabled,
  }));

  return (
    <Shell
      tools={toolManifests}
      activeToolId={activeToolId}
      onToolSelect={handleToolSelect}
      isCollapsed={isCollapsed}
      onToggle={() => setIsCollapsed((prev) => !prev)}
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      {children}
    </Shell>
  );
}
