import React from "react";
import ReactDOM from "react-dom/client";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";
import "./index.css";
import { setDbOnStartup } from "./features/core-hour/db-tauri";
import { ensureLocalUser } from "./lib/auth";
import { discoverTools } from "./lib/tool-registry/discovery";
import { I18nProvider } from "./lib/i18n";
import { PauseHydrateProvider } from "./features/pause-hydrate/context";
import { AppearanceProvider, initializeAppearance } from "./lib/appearance";
import { CoreHourRuntimeProvider } from "./features/core-hour/runtime";
import { desktopPetEnabled, setDesktopPetEnabled } from "./lib/desktop-reminders";
import { resolveDesktopPetSelection, updateDesktopPetWindow } from "./lib/desktop-pet-catalog";
import { applyWindowCloseBehavior, loadWindowCloseBehavior, supportsWindowCloseBehavior } from "./lib/window-close";
import {
  applyPortablePreferences,
  takeAppliedRestorePreferences,
} from "./lib/data-control";

async function bootstrap() {
  if (isTauri() && getCurrentWebviewWindow().label === "desktop-pet") {
    const { DesktopPet } = await import("./components/desktop-pet");
    document.documentElement.classList.add("desktop-pet-window");
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<DesktopPet />);
    return;
  }
  try {
    const restoredPreferences = await takeAppliedRestorePreferences();
    if (restoredPreferences) applyPortablePreferences(restoredPreferences);
  } catch (error) {
    console.warn("Restored preferences could not be applied.", error);
  }
  initializeAppearance();
  await setDbOnStartup();
  if (supportsWindowCloseBehavior()) {
    try {
      await applyWindowCloseBehavior(await loadWindowCloseBehavior());
    } catch (error) {
      console.warn("Could not restore the window close behavior.", error);
    }
  }
  await ensureLocalUser();
  await discoverTools();
  try {
    if (await desktopPetEnabled()) {
      const selection = await resolveDesktopPetSelection();
      await updateDesktopPetWindow(selection.petId, selection.variantId);
      await setDesktopPetEnabled(true);
    }
  } catch (error) {
    console.warn("The desktop pet could not be started.", error);
  }


  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <I18nProvider>
        <AppearanceProvider>
          <CoreHourRuntimeProvider>
            <PauseHydrateProvider>
              <App />
            </PauseHydrateProvider>
          </CoreHourRuntimeProvider>
        </AppearanceProvider>
      </I18nProvider>
    </React.StrictMode>,
  );
}

bootstrap();
