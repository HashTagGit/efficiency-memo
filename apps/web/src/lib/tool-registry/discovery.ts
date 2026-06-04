import type { ToolManifest } from '@memo/shared';
import { registerTool } from './registry';
import type { RegisteredTool } from './types';

/**
 * Discover tools by scanning the features directory for manifest files.
 * Each feature directory should contain a manifest.ts that exports the tool manifest
 * and a component loader function.
 */
export async function discoverTools(): Promise<RegisteredTool[]> {
  const tools: RegisteredTool[] = [];

  // Define which features to auto-register
  // In a real implementation, this could scan the directory dynamically
  const featureModules = [
    // Feature manifests will be imported dynamically when they exist
    // This allows lazy loading without eagerly importing all features
  ];

  // Try to load known feature manifests
  // Using dynamic imports to avoid eagerly loading all tools
  const featureNames = ['charger-reminder', 'core-hour'];

  for (const featureName of featureNames) {
    try {
      // Dynamically import the manifest
      const manifest = await import(`@/features/${featureName}/manifest`) as {
        default: ToolManifest;
        componentLoader: () => Promise<{ default: React.ComponentType }>;
      };

      if (manifest?.default?.id && manifest?.componentLoader) {
        registerTool(manifest.default, manifest.componentLoader);
        tools.push({
          ...manifest.default,
          componentLoader: manifest.componentLoader,
        });
      }
    } catch {
      // Feature doesn't exist yet - that's okay for discovery
      // Silently skip features that aren't implemented
    }
  }

  return tools;
}

/**
 * Get the component loader for a specific tool
 */
export async function loadToolComponent<T extends { default: React.ComponentType }>(
  toolId: string
): Promise<() => Promise<T>> {
  const tool = (await import('./registry')).getToolById(toolId);

  if (!tool) {
    throw new Error(`Tool not found: ${toolId}`);
  }

  return () => tool.componentLoader() as Promise<T>;
}