import type { ToolManifest } from "@memo/shared";

export const chManifest: ToolManifest = {
  id: "core-hour",
  name: "CoreHour",
  icon: "clock",
  description: "Track how you spend your time with periodic check-ins and tag-based categorization",
  routes: [
    "/tools/core-hour",
    "/tools/core-hour/history",
    "/tools/core-hour/tags",
    "/tools/core-hour/review",
    "/tools/core-hour/review/week",
    "/tools/core-hour/settings",
  ],
  enabled: true,
};
