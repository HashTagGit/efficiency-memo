import type { ToolManifest } from "@memo/shared";

export const pauseHydrateManifest: ToolManifest = {
  id: "pause-hydrate",
  name: "Pause & Hydrate",
  icon: "droplet",
  description: "Gentle break and hydration reminders with local activity history",
  routes: ["/tools/pause-hydrate"],
  enabled: true,
};
