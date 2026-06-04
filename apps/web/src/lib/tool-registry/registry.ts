import type { ToolManifest } from "@memo/shared";
import type { RegisteredTool } from "./types";

// Internal registry Map - not exported directly (use accessor functions)
const _registry = new Map<string, RegisteredTool>();

/**
 * Register a tool in the registry with its manifest and component loader.
 */
export function registerTool(
  manifest: ToolManifest,
  componentLoader: () => Promise<{ default: React.ComponentType }>
): void {
  const registered: RegisteredTool = {
    ...manifest,
    componentLoader,
  };
  _registry.set(manifest.id, registered);
}

/**
 * Get all registered tools as an array.
 */
export function getRegisteredTools(): RegisteredTool[] {
  return Array.from(_registry.values());
}

/**
 * Get a specific tool by its ID, or undefined if not found.
 */
export function getToolById(id: string): RegisteredTool | undefined {
  return _registry.get(id);
}

/**
 * Clear all registered tools (useful for testing).
 */
export function clearRegistry(): void {
  _registry.clear();
}