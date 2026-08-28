/**
 * Discover tools by importing feature index files.
 * Each feature's index.ts calls registerTool on import.
 */
export async function discoverTools(): Promise<void> {
  await import("../../features/core-hour/index");
  await import("../../features/pause-hydrate/index");
}
