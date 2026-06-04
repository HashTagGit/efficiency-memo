"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Shell } from "@memo/ui";
import type { ToolManifest } from "@memo/shared";
import { getActiveTool } from "@/lib/shell/tool-navigation";

interface ShellLayoutClientProps {
  userEmail: string;
  tools: ToolManifest[];
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}

export function ShellLayoutClient({
  userEmail,
  tools,
  signOutAction,
  children,
}: ShellLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const activeToolId = getActiveTool(pathname);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToolSelect = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (tool?.routes[0]) {
      router.push(tool.routes[0]);
    }
  };

  return (
    <Shell
      tools={tools}
      activeToolId={activeToolId}
      onToolSelect={handleToolSelect}
      isCollapsed={isCollapsed}
      onToggle={() => setIsCollapsed((prev) => !prev)}
      userEmail={userEmail}
      onSignOut={() => signOutAction()}
    >
      {children}
    </Shell>
  );
}
