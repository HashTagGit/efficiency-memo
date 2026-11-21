import React, { useEffect, useRef, useState } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { Button } from "@memo/ui";
import { initializeAppearance } from "../lib/appearance";
import type { DesktopPetBehaviorPreferences, DesktopPetFocus, DesktopReminder } from "../lib/desktop-reminders";
import { DEFAULT_PET, loadDesktopPetSprite } from "../lib/desktop-pet-catalog";
import { detectInitialLocale, translate } from "../lib/i18n";
import { PetSprite, type PetPose } from "./pet-sprite";
import { PET_TRACKS } from "../lib/codex-pet";
import { useDesktopPetGestures } from "./desktop-pet-gestures";
import { useDesktopPetBehavior } from "./desktop-pet-behavior";
import { useDesktopPetHitTest } from "./desktop-pet-hit-test";
import "./desktop-pet.css";

interface PetView {
  current: (DesktopReminder & { id: number }) | null;
  count: number;
  petId: string | null;
  snoozing?: boolean;
  snoozeFailed?: boolean;
  focus?: DesktopPetFocus;
  preferences?: DesktopPetBehaviorPreferences;
  mini?: "left" | "right" | null;
  dock?: "left" | "right" | null;
}

const JUMP_DURATION = PET_TRACKS[4].reduce((sum, duration) => sum + duration, 0);
const WAVE_DURATION = PET_TRACKS[3].reduce((sum, duration) => sum + duration, 0);

export function DesktopPet() {
  const [view, setView] = useState<PetView>({ current: null, count: 0, petId: null });
  const [pet, setPet] = useState(DEFAULT_PET);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revealedId, setRevealedId] = useState<number | null>(null);
  const [wave, setWave] = useState(0);
  const [ready, setReady] = useState(false);
  const [held, setHeld] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastTapAt = useRef(-Infinity);
  const bubble = useRef<HTMLElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const { current, count } = view;
  const locale = detectInitialLocale();
  const t = (key: string) => translate(locale, `desktopPet.${key}`);
  useDesktopPetHitTest(ready, avatar, bubble, pet.atlas, held || menuOpen);

  useEffect(() => {
    let active = true;
    const onChange = new Channel<PetView>((next) => {
      if (!active) return;
      initializeAppearance();
      document.documentElement.lang = detectInitialLocale();
      if (next.current) setWave(0);
      setView(next);
      setReady(true);
    });
    void invoke("desktop_pet_ready", { onChange }).catch((error) => {
      console.warn("Could not start the desktop pet.", error);
    });
    return () => { active = false; };
  }, []);

  const petId = view.petId ?? DEFAULT_PET.manifest.id;
  useEffect(() => {
    let active = true;
    void loadDesktopPetSprite(petId).then((selected) => {
      if (active) setPet(selected);
    }).catch((error) => {
      if (active) setPet(DEFAULT_PET);
      console.warn("Could not load the selected desktop pet.", error);
    });
    return () => { active = false; };
  }, [petId]);

  const reminderId = current?.id;
  useEffect(() => {
    if (reminderId === undefined) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setRevealedId(reminderId);
      return;
    }
    const timer = window.setTimeout(() => setRevealedId(reminderId), JUMP_DURATION);
    return () => window.clearTimeout(timer);
  }, [reminderId]);

  useEffect(() => {
    if (reminderId === undefined || revealedId !== reminderId) return;
    let frame = 0;
    let sent = false;
    function confirm() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          const bounds = bubble.current?.getBoundingClientRect();
          if (sent || document.hidden || !bounds || !bounds.width || !bounds.height
            || bounds.left < 0 || bounds.top < 0 || bounds.right > window.innerWidth || bounds.bottom > window.innerHeight) return;
          sent = true;
          void invoke<boolean>("confirm_desktop_pet_reminder_shown", { id: reminderId })
            .then((confirmed) => { sent = confirmed; }).catch(() => { sent = false; });
        });
      });
    }
    confirm();
    window.addEventListener("resize", confirm);
    document.addEventListener("visibilitychange", confirm);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", confirm);
      document.removeEventListener("visibilitychange", confirm);
    };
  }, [reminderId, revealedId]);

  useEffect(() => {
    if (!wave) return;
    const timer = window.setTimeout(() => setWave(0), WAVE_DURATION);
    return () => window.clearTimeout(timer);
  }, [wave]);

  const { sample, interrupt } = useDesktopPetBehavior({
    ready, held: held || menuOpen || Boolean(wave),
    blocked: Boolean(current || view.mini) || view.focus === "working" || view.focus === "waiting",
    supportsLook: pet.manifest.spriteVersionNumber === 2, preferences: view.preferences,
  });
  const pose: PetPose = current ? "alert" : wave ? "greeting" : view.focus === "waiting" ? "waiting"
    : view.focus === "working" ? "working" : sample.sleeping ? "sleeping"
      : sample.walking === "left" ? "walk-left" : sample.walking === "right" ? "walk-right" : "idle";

  function tap() {
    const now = performance.now();
    if (current || now - lastTapAt.current < WAVE_DURATION) return;
    interrupt();
    lastTapAt.current = now;
    setWave(now);
  }

  const gestureHandlers = useDesktopPetGestures(!current && !view.mini, tap, (pressed) => {
    if (pressed) interrupt();
    setHeld(pressed);
  });

  function openMenu() {
    interrupt();
    setMenuOpen(true);
    void invoke("open_desktop_pet_menu", { labels: {
      assistant: t("assistant"), hide: t("hide"), resetPosition: t("resetPosition"),
    } }).catch((error) => console.warn("Desktop pet menu could not be shown.", error))
      .finally(() => setMenuOpen(false));
  }

  async function respond(action: "dismiss" | "open" | "snooze") {
    if (!current || busy || view.snoozing) return;
    setBusy(true);
    setFailed(false);
    try {
      if (action === "snooze") await invoke("snooze_desktop_pet_reminder", { id: current.id });
      else await invoke("respond_to_desktop_pet_reminder", { id: current.id, open: action === "open" });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      aria-label={t("name")}
      data-mini={view.mini ?? undefined}
      data-left-alert={current && view.dock === "left" ? "" : undefined}
      onKeyDown={(event) => { if (event.key === "Escape" && revealedId === reminderId) void respond("dismiss"); }}
    >
      <button
        ref={avatar}
        type="button"
        className={`desktop-pet-avatar touch-none rounded-md ${held ? "outline-none" : "focus-visible:outline-2 focus-visible:outline-focus-ring"}`}
        aria-label={t(view.mini ? "peek" : "name")}
        data-draggable={!current && !view.mini}
        {...gestureHandlers}
        onClick={(event) => {
          if (view.mini) void invoke("peek_desktop_pet").catch((error) => console.warn("Desktop pet could not peek.", error));
          else if (event.detail === 0) tap();
        }}
        onContextMenu={(event) => { event.preventDefault(); openMenu(); }}
        onKeyDown={(event) => {
          if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
          event.preventDefault();
          openMenu();
        }}
      >
        <span className="desktop-pet-character" role="img" aria-label={t("name")}>
          <PetSprite key={`${pet.manifest.id}:${current?.id ?? wave}`} pet={pet} animated pose={pose} gaze={pose === "idle" ? sample.gaze : null} peekSide={view.mini} />
          {!view.mini && pose === "sleeping" ? <span aria-hidden="true" className="desktop-pet-sleep">Z</span> : null}
        </span>
      </button>
      {current && revealedId === current.id ? (
        <section ref={bubble} className="desktop-pet-bubble bg-surface text-foreground" aria-labelledby="pet-reminder-title">
          <div aria-live="polite" aria-atomic="true">
            <h1 id="pet-reminder-title" className="text-sm font-semibold leading-5">{current.title}</h1>
            <p className="mt-1 text-xs leading-[1.45] text-muted">{current.body}</p>
          </div>
          <div className="desktop-pet-actions">
            <span className="me-auto text-xs text-muted" role="status">
              {failed || view.snoozeFailed ? t("actionError") : count > 1 ? translate(locale, "desktopPet.waiting", { count: count - 1 }) : ""}
            </span>
            {(current.kind === "break" || current.kind === "hydration") ? (
              <Button variant="ghost" size="sm" disabled={busy || view.snoozing} onClick={() => void respond("snooze")}>{t("snooze")}</Button>
            ) : null}
            <Button variant="ghost" size="sm" disabled={busy || view.snoozing} onClick={() => void respond("dismiss")}>{t("dismiss")}</Button>
            {current.kind !== "preview" ? (
              <Button size="sm" disabled={busy || view.snoozing} onClick={() => void respond("open")}>{t("open")}</Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
