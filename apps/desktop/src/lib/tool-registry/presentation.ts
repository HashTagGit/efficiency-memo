import type { ToolManifest } from "@memo/shared";

const translationKeys: Record<string, { name: string; description: string }> = {
  "core-hour": { name: "nav.coreHour", description: "nav.coreHourDescription" },
  "pause-hydrate": { name: "nav.pauseHydrate", description: "nav.pauseHydrateDescription" },
};

export function localizedToolCopy(
  tool: ToolManifest,
  translate: (key: string) => string,
): { name: string; description: string } {
  const keys = translationKeys[tool.id];
  return keys
    ? { name: translate(keys.name), description: translate(keys.description) }
    : { name: tool.name, description: tool.description };
}
