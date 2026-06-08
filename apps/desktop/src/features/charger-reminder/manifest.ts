import type { ToolManifest } from "@memo/shared";

export const crManifest: ToolManifest = {
  id: "charger-reminder",
  name: "Charger Reminder",
  icon: "battery",
  description: "Track device batteries and get reminded to charge before they run out",
  routes: ["/tools/charger-reminder"],
  enabled: true,
};
