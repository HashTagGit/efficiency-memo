import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setDbOnStartup } from "./features/core-hour/db-tauri";
import { ensureLocalUser } from "./lib/auth";
import { discoverTools } from "./lib/tool-registry/discovery";
import { I18nProvider } from "./lib/i18n";
import { PauseHydrateProvider } from "./features/pause-hydrate/context";
import { AppearanceProvider, initializeAppearance } from "./lib/appearance";
import {
  applyPortablePreferences,
  takeAppliedRestorePreferences,
} from "./lib/data-control";

async function bootstrap() {
  try {
    const restoredPreferences = await takeAppliedRestorePreferences();
    if (restoredPreferences) applyPortablePreferences(restoredPreferences);
  } catch (error) {
    console.warn("Restored preferences could not be applied.", error);
  }
  initializeAppearance();
  await setDbOnStartup();
  await ensureLocalUser();
  await discoverTools();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <I18nProvider>
        <AppearanceProvider>
          <PauseHydrateProvider>
            <App />
          </PauseHydrateProvider>
        </AppearanceProvider>
      </I18nProvider>
    </React.StrictMode>,
  );
}

bootstrap();
