import { useRef, type PointerEvent } from "react";
import { invoke } from "@tauri-apps/api/core";

const DRAG_THRESHOLD = 5;
type DragPhase = "start" | "move" | "end" | "cancel";

interface Press {
  id: number;
  x: number;
  y: number;
  anchor: { x: number; y: number };
  started: Promise<boolean> | null;
  moving: Promise<void> | null;
}

function sendDrag(phase: DragPhase) {
  return invoke<void>("drag_desktop_pet", { phase });
}

export function useDesktopPetGestures(canInteract: boolean, tap: () => void, onHold: (held: boolean) => void) {
  const press = useRef<Press | null>(null);
  const finishing = useRef(false);

  function finish(event: PointerEvent<HTMLButtonElement>, cancelled: boolean) {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    press.current = null;
    if (!current.started) {
      onHold(false);
      if (!cancelled && canInteract) tap();
      return;
    }
    finishing.current = true;
    void current.started.then(async (started) => {
      if (!started) return;
      await current.moving;
      await sendDrag(cancelled ? "cancel" : "end");
    }).catch((error) => console.warn("Desktop pet drag could not finish.", error))
      .finally(() => { finishing.current = false; onHold(false); });
  }

  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (!canInteract || event.button !== 0 || press.current || finishing.current) return;
      onHold(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      press.current = {
        id: event.pointerId,
        x: event.screenX,
        y: event.screenY,
        anchor: { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight },
        started: null,
        moving: null,
      };
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const current = press.current;
      if (!current || current.id !== event.pointerId || current.moving) return;
      if (!current.started) {
        if (!canInteract || Math.hypot(event.screenX - current.x, event.screenY - current.y) < DRAG_THRESHOLD) return;
        current.started = invoke<void>("drag_desktop_pet", { phase: "start", anchor: current.anchor }).then(() => true).catch((error) => {
          console.warn("Desktop pet drag could not start.", error);
          return false;
        });
        return;
      }
      current.moving = current.started.then(async (started) => {
        if (started && press.current === current) await sendDrag("move");
      }).catch((error) => console.warn("Desktop pet could not move.", error))
        .finally(() => { current.moving = null; });
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => finish(event, true),
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => finish(event, true),
  };
}
