import { supportsDesktopPet } from "../desktop-reminders";
import { registerPetAssistant } from "../../features/pet-assistant";

/**
 * Discover tools by importing feature index files.
 */
export async function discoverTools(): Promise<void> {
  await import("../../features/core-hour/index");
  await import("../../features/pause-hydrate/index");
  if (supportsDesktopPet()) registerPetAssistant();
}
