#!/usr/bin/env node
/**
 * Render clawd-on-desk theme SVG states into Codex Pet frame PNGs.
 *
 * The clawd-on-desk repository ships its desktop pet as animated SVGs
 * (`assets/svg/clawd-*.svg`) rather than raster atlases. This helper samples each
 * state's CSS animation at fixed times in a headless Chromium and writes
 * transparent 192 x 208 cells that `scripts/prepare-desktop-pet.py --frames` can
 * assemble into a V2 package (see CONTRIBUTING.md).
 *
 * Usage:
 *   pnpm exec playwright install chromium
 *   node scripts/render-clawd-pet.mjs \
 *     --svg-dir ../clawd-on-desk/assets/svg --out ../clawd-frames
 *   python scripts/prepare-desktop-pet.py --frames ../clawd-frames \
 *     --output apps/desktop/src/assets/pets --id clawd --version 2 \
 *     --name Clawd --description "..."
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
// 24 x 26 SVG units at 8 px per unit, anchored from the theme's contentBox/baseline
// (see themes/clawd/theme.json in clawd-on-desk).
const VIEW_BOX = [-4.5, -7.5, 24, 26];

const TRACKS = {
  idle: { svg: "clawd-idle-follow.svg", frames: 6, period: 3.2, start: 0, mirror: false },
  "running-right": { svg: "clawd-mini-crabwalk.svg", frames: 8, period: 4, start: 0.3, mirror: false },
  "running-left": { svg: "clawd-mini-crabwalk.svg", frames: 8, period: 4, start: 0.3, mirror: true },
  waving: { svg: "clawd-happy.svg", frames: 4, period: 1, start: 0, mirror: false },
  jumping: { svg: "clawd-react-double-jump.svg", frames: 5, period: 3.5, start: 0, mirror: false },
  failed: { svg: "clawd-error.svg", frames: 8, period: 3, start: 0, mirror: false },
  waiting: { svg: "clawd-notification.svg", frames: 6, period: 6, start: 0, mirror: false },
  running: { svg: "clawd-working-typing.svg", frames: 6, period: 2.1, start: 0, mirror: false },
  review: { svg: "clawd-idle-reading.svg", frames: 6, period: 14, start: 0, mirror: false },
};

// The theme tracks eyes, body, and shadow separately; these amplitudes keep the
// gaze readable inside the smaller cell without pushing the eye off the torso.
const GAZE_X = 1.3;
const GAZE_Y = 0.9;
const BODY_SCALE = 0.33;

const CONTRACT = JSON.parse(readFileSync(
  new URL("../apps/desktop/src/lib/codex-pet-atlas.json", import.meta.url), "utf8",
));

// Fail loudly if the renderer drifts from the atlas contract the app consumes.
function lookFrames() {
  const counts = new Map(CONTRACT.tracks.map((track) => [track.name, track.durations.length]));
  for (const [name, track] of Object.entries(TRACKS)) {
    if (counts.get(name) !== track.frames) {
      throw new Error(`${name} renders ${track.frames} frames but the atlas contract expects ${counts.get(name)}`);
    }
  }
  if (counts.size !== Object.keys(TRACKS).length) {
    throw new Error("the renderer does not cover every animation track in the atlas contract");
  }
  return CONTRACT.lookFrames;
}

const LOOK_FRAMES = lookFrames();

function pageHtml(svg, mirror) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
#stage{width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;overflow:hidden;position:relative}
svg{position:absolute;left:0;top:0;width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;${mirror ? "transform:scaleX(-1)" : ""}}
#eyes-js,#body-js,#shadow-js{transition:none !important}
</style></head><body><div id="stage">${svg}</div></body></html>`;
}

function gazeScript(index) {
  const radians = (index * 22.5 * Math.PI) / 180;
  const dx = Math.sin(radians) * GAZE_X;
  const dy = -Math.cos(radians) * GAZE_Y;
  const bodyDx = Math.round(dx * BODY_SCALE * 2) / 2;
  const bodyDy = Math.round(dy * BODY_SCALE * 2) / 2;
  const scaleX = 1 + Math.abs(bodyDx) * 0.15;
  const shiftX = Math.round(bodyDx * 0.3 * 2) / 2;
  return `document.getElementById("eyes-js").setAttribute("transform", "translate(${dx.toFixed(2)}, ${dy.toFixed(2)})");
document.getElementById("body-js").setAttribute("transform", "translate(${bodyDx}, ${bodyDy})");
document.getElementById("shadow-js").setAttribute("transform", "translate(${shiftX}, 0) scale(${scaleX.toFixed(2)}, 1)");`;
}

async function capture(page, svg, { time, mirror = false, script = "" }) {
  await page.setContent(pageHtml(svg, mirror));
  await page.evaluate(({ viewBox, timeMs, script, width, height }) => {
    const root = document.querySelector("svg");
    root.setAttribute("viewBox", viewBox);
    root.setAttribute("width", String(width));
    root.setAttribute("height", String(height));
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = timeMs;
    }
    if (script) new Function(script)();
    // Let the paused state paint before the screenshot is taken.
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { viewBox: VIEW_BOX.join(" "), timeMs: time * 1000, script, width: FRAME_WIDTH, height: FRAME_HEIGHT });
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT } });
}

async function main() {
  const { values } = parseArgs({
    options: {
      "svg-dir": { type: "string" },
      out: { type: "string" },
    },
  });
  if (!values["svg-dir"] || !values.out) {
    throw new Error("usage: node scripts/render-clawd-pet.mjs --svg-dir <clawd assets/svg> --out <frames dir>");
  }
  const svgDir = path.resolve(values["svg-dir"]);
  const outDir = path.resolve(values.out);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    deviceScaleFactor: 1,
  });
  try {
    for (const [name, track] of Object.entries(TRACKS)) {
      const svg = await readFile(path.join(svgDir, track.svg), "utf8");
      const target = path.join(outDir, name);
      await mkdir(target, { recursive: true });
      for (let index = 0; index < track.frames; index += 1) {
        const time = track.start + (index / track.frames) * track.period;
        const png = await capture(page, svg, { time, mirror: track.mirror });
        await writeFile(path.join(target, `${String(index + 1).padStart(2, "0")}.png`), png);
      }
    }

    const idle = await readFile(path.join(svgDir, TRACKS.idle.svg), "utf8");
    const gazeDir = path.join(outDir, "look");
    await mkdir(gazeDir, { recursive: true });
    for (let index = 0; index < LOOK_FRAMES; index += 1) {
      const png = await capture(page, idle, { time: 0, script: gazeScript(index) });
      await writeFile(path.join(gazeDir, `${String(index + 1).padStart(2, "0")}.png`), png);
    }
  } finally {
    await browser.close();
  }
  console.log(`Rendered ${Object.values(TRACKS).reduce((sum, track) => sum + track.frames, 0) + LOOK_FRAMES} frames into ${outDir}`);
}

await main();
