import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { setDbOnStartup } from "./features/core-hour/db-tauri";
import { ensureLocalUser } from "./lib/auth";
import { discoverTools } from "./lib/tool-registry/discovery";

async function bootstrap() {
  await setDbOnStartup();
  await ensureLocalUser();
  await discoverTools();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
