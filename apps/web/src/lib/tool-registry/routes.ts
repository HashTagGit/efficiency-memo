import { getRegisteredTools } from './registry';

interface RouteConfig {
  path: string;
}

/**
 * Generate Next.js route configuration from registered tools.
 * Maps tool manifest routes to their corresponding dynamic route handlers.
 */
export function generateToolRoutes(): RouteConfig[] {
  const tools = getRegisteredTools();
  const routes: RouteConfig[] = [];

  for (const tool of tools) {
    if (!tool.enabled) continue;

    for (const route of tool.routes) {
      // Convert route path to Next.js route format
      // e.g., '/tools/charger-reminder' -> 'tools/charger-reminder'
      const path = route.replace(/^\//, '');
      routes.push({
        path: `/${path}`,
        // The actual page component is rendered by the catch-all route
        // This just registers the available paths
      });
    }
  }

  return routes;
}

/**
 * Get the route path for a specific tool
 */
export function getToolRoutePath(toolId: string): string | undefined {
  const tool = getRegisteredTools().find((t) => t.id === toolId);
  return tool?.routes[0];
}