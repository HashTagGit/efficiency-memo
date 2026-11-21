import { useEffect, type RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PET_FRAME_HEIGHT, PET_FRAME_WIDTH } from "../lib/codex-pet";

type Rect = { x: number; y: number; width: number; height: number };

function rectFor(element: Element | null): Rect | null {
  const bounds = element?.getBoundingClientRect();
  return bounds?.width && bounds.height ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null;
}

function alphaAtFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, frame: HTMLElement) {
  const rect = rectFor(frame);
  const cell = frame.dataset.petFrame;
  if (!rect || !cell) return null;
  const [row, column] = cell.split(":").map(Number);
  const width = Math.min(100, Math.ceil(rect.width));
  const height = Math.min(100, Math.ceil(rect.height));
  context.canvas.width = width;
  context.canvas.height = height;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, column * PET_FRAME_WIDTH, row * PET_FRAME_HEIGHT, PET_FRAME_WIDTH, PET_FRAME_HEIGHT, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  let pixels = "";
  for (let index = 3; index < data.length; index += 4) pixels += data[index] > 8 ? "1" : "0";
  return { rect, width, height, pixels };
}

export function useDesktopPetHitTest(
  ready: boolean, avatar: RefObject<HTMLButtonElement | null>, bubble: RefObject<HTMLElement | null>, atlas: string, held: boolean,
) {
  useEffect(() => {
    if (!ready || !avatar.current || !window.MutationObserver) return;
    const image = new Image();
    const target = avatar.current;
    let context: CanvasRenderingContext2D | null | undefined;
    let frameId = 0;
    let previous = "";

    function report() {
      const frame = target.querySelector<HTMLElement>("[data-pet-frame]");
      let sprite = null;
      if (image.complete && image.naturalWidth && frame) {
        if (context === undefined) context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
        try { if (context) sprite = alphaAtFrame(context, image, frame); } catch { /* Use the avatar bounds until raster data is available. */ }
      }
      const bubbleRect = rectFor(bubble.current);
      const radius = bubble.current ? Number.parseFloat(window.getComputedStyle(bubble.current).borderTopLeftRadius) || 0 : 0;
      const regions = { avatar: rectFor(target), bubble: bubbleRect && { ...bubbleRect, radius }, held, sprite };
      const fingerprint = JSON.stringify(regions);
      if (fingerprint === previous) return;
      previous = fingerprint;
      void invoke("update_desktop_pet_hit_regions", { regions }).catch(() => { previous = ""; });
    }

    const schedule = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(report);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(target.parentElement ?? target, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ["data-pet-frame", "data-mini", "data-peek-nod", "data-left-alert"],
    });
    const resize = window.ResizeObserver ? new ResizeObserver(schedule) : null;
    resize?.observe(document.documentElement);
    window.addEventListener("resize", schedule);
    image.onload = schedule;
    image.src = atlas;
    schedule();
    return () => {
      image.onload = null;
      observer.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frameId);
    };
  }, [ready, avatar, bubble, atlas, held]);
}
