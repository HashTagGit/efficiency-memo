import { redirect } from "next/navigation";
import { Shell } from "@memo/ui";
import { requireSessionUser } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { getToolList, getActiveTool } from "@/lib/shell/tool-navigation";
import { ShellLayoutClient } from "./shell-layout-client";

interface ShellLayoutProps {
  children: React.ReactNode;
}

export default async function ShellLayout({ children }: ShellLayoutProps) {
  // Auth gate: redirect unauthenticated users to /sign-in
  const user = await requireSessionUser();

  // Get tools from registry
  const tools = getToolList();

  return (
    <ShellLayoutClient
      userEmail={user.email}
      tools={tools}
      signOutAction={signOutAction}
    >
      {children}
    </ShellLayoutClient>
  );
}
