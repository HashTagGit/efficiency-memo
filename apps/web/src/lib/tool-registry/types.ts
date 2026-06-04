import type { ToolManifest } from "@memo/shared";

// RegisteredTool extends ToolManifest with a componentLoader for lazy loading
export interface RegisteredTool extends ToolManifest {
  componentLoader: () => Promise<{ default: React.ComponentType }>;
}