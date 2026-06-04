import type { ToolManifest } from "@memo/shared";
import { getRegisteredTools } from "@/lib/tool-registry/registry";

/**
 * Get the list of all registered tools (enabled only).
 * Returns ToolManifest[] for use in the Shell sidebar.
 */
export function getToolList(): ToolManifest[] {
  return getRegisteredTools()
    .filter((tool) => tool.enabled)
    .map((tool) => ({
      id: tool.id,
      name: tool.name,
      icon: tool.icon,
      description: tool.description,
      routes: tool.routes,
      enabled: tool.enabled,
    }));
}

/**
 * Get the active tool ID from a pathname.
 * Matches against registered tool routes.
 * Returns the tool ID or empty string if no match.
 */
export function getActiveTool(pathname: string): string {
  const tools = getRegisteredTools();

  for (const tool of tools) {
    if (!tool.enabled) continue;

    for (const route of tool.routes) {
      // Normalize: ensure both start with /
      const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
      const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

      // Match exact or prefix (e.g., /tools/charger-reminder matches /tools/charger-reminder/*)
      if (
        normalizedPath === normalizedRoute ||
        normalizedPath.startsWith(`${normalizedRoute}/`)
      ) {
        return tool.id;
      }
    }
  }

  return "";
}
