#!/usr/bin/env node
/**
 * Dashboard launcher — Vite programmatic server that actually applies the
 * React + Tailwind plugins from vite.config.ts.
 *
 * The previous wrapper used loadConfigFromFile() but Vite's TSX transform
 * wasn't being applied (served main.tsx had raw JSX). The fix: import the
 * config directly so Vite's bundler evaluates the plugins and the user's
 * server middleware (token gate) before we call createServer.
 */
const path = require("path");
const { pathToFileURL } = require("url");
const { createServer } = require("vite");

const DASHBOARD_DIR = "C:\\Users\\LinJunye\\.understand-anything-plugin\\packages\\dashboard";
const GRAPH_DIR = "D:\\documents\\code\\git\\release\\EfficiencyMemo";
const PORT = 5173;
const HOST = "127.0.0.1";

(async () => {
  // Import the TS config directly — this is what `vite` CLI does internally.
  // loadConfigFromFile() also works but loses some of the plugin registration
  // ordering in our test. A direct import guarantees plugin evaluation.
  const configMod = await import(
    pathToFileURL(path.join(DASHBOARD_DIR, "vite.config.ts")).href +
      `?t=${Date.now()}`
  );
  const userConfig = configMod.default ?? {};
  console.log("[wrapper] config plugins:", userConfig.plugins?.length ?? 0);

  // Build the effective config. Override only what's needed for the local fix:
  //  - bind to 127.0.0.1 (already set in vite.config.ts, repeat for safety)
  //  - disable the dep optimizer to avoid the Vite 6.4.3 + workspace
  //    @understand-anything/core TypeError on first request.
  //  - pass GRAPH_DIR so the token-gate plugin can locate the graph.
  const config = {
    ...userConfig,
    root: DASHBOARD_DIR,
    configFile: false,
    server: {
      ...(userConfig.server || {}),
      host: HOST,
      port: PORT,
    },
    optimizeDeps: {
      ...(userConfig.optimizeDeps || {}),
      noDiscovery: true,
      include: [],
    },
    logLevel: "info",
  };

  process.env.GRAPH_DIR = GRAPH_DIR;

  const server = await createServer(config);
  await server.listen();

  // The original vite.config.ts plugin prints the token URL via
  // server.httpServer.once("listening"). We print a fallback here in case
  // the listening event already fired before our hook is registered.
  const address = server.httpServer?.address();
  const port = typeof address === "object" && address ? address.port : PORT;
  const tokenFromEnv = process.env.UNDERSTAND_ACCESS_TOKEN;
  const tokenHint = tokenFromEnv
    ? `/?token=${tokenFromEnv}`
    : "/?token=<see the URL printed by the serve-knowledge-graph plugin above>";
  console.log(`\n  🔑  Dashboard URL: http://${HOST}:${port}${tokenHint}\n`);
  console.log("Press Ctrl+C to stop.");
})().catch((err) => {
  console.error("Failed to start Vite:", err);
  process.exit(1);
});
