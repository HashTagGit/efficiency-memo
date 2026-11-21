import { registerTool } from "../../lib/tool-registry/registry";

export const PET_ASSISTANT_ROUTE = "/tools/pet-assistant";
export const loadPetAssistantPage = () => import("./page");

export function registerPetAssistant() {
  registerTool({
    id: "pet-assistant",
    name: "Pet Assistant",
    icon: "paw",
    description: "Choose a desktop pet and manage its reminders.",
    routes: [PET_ASSISTANT_ROUTE],
    enabled: true,
  }, loadPetAssistantPage);
}
