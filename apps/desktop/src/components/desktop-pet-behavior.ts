import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DesktopPetBehaviorPreferences } from "../lib/desktop-reminders";

interface BehaviorSample {
  gaze: number | null;
  sleeping: boolean;
  walking: "left" | "right" | null;
}

const EMPTY_SAMPLE: BehaviorSample = { gaze: null, sleeping: false, walking: null };

export function useDesktopPetBehavior({
  ready, held, blocked, supportsLook, preferences,
}: {
  ready: boolean;
  held: boolean;
  blocked: boolean;
  supportsLook: boolean;
  preferences?: DesktopPetBehaviorPreferences;
}) {
  const [sample, setSample] = useState(EMPTY_SAMPLE);
  const lookEnabled = Boolean(preferences?.lookEnabled && supportsLook);
  const walkEnabled = Boolean(preferences?.walkEnabled);

  const interrupt = useCallback(() => {
    setSample(EMPTY_SAMPLE);
    void invoke("interrupt_desktop_pet_motion").catch((error) => console.warn("Desktop pet motion could not stop.", error));
  }, []);

  useEffect(() => {
    setSample(EMPTY_SAMPLE);
    if (!ready || blocked || held) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let disposed = false;
    let pending = false;
    let refresh = false;

    async function poll() {
      window.clearTimeout(timer);
      if (document.hidden || disposed) return;
      if (pending) {
        refresh = true;
        return;
      }
      pending = true;
      refresh = false;
      const reducedMotion = Boolean(motion?.matches);
      let delay = lookEnabled && !reducedMotion ? 125 : 500;
      try {
        const next = await invoke<BehaviorSample>("sample_desktop_pet_behavior", {
          input: { held: false, supportsLook, reducedMotion },
        });
        if (!disposed && !refresh && !document.hidden && next) {
          setSample((previous) => previous.gaze === next.gaze && previous.walking === next.walking
            && previous.sleeping === next.sleeping ? previous : next);
          if (next.walking) delay = 50;
        }
      } catch (error) {
        if (!disposed) setSample(EMPTY_SAMPLE);
        console.warn("Desktop pet behavior could not be read.", error);
        delay = 1000;
      } finally {
        pending = false;
        if (!disposed && !document.hidden) timer = window.setTimeout(() => void poll(), refresh ? 0 : delay);
      }
    }

    function refreshBehavior() {
      setSample(EMPTY_SAMPLE);
      if (document.hidden || motion?.matches) interrupt();
      void poll();
    }

    void poll();
    motion?.addEventListener("change", refreshBehavior);
    document.addEventListener("visibilitychange", refreshBehavior);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      motion?.removeEventListener("change", refreshBehavior);
      document.removeEventListener("visibilitychange", refreshBehavior);
    };
  }, [ready, blocked, held, lookEnabled, walkEnabled, supportsLook, interrupt]);

  return { sample: blocked || held ? EMPTY_SAMPLE : sample, interrupt };
}
