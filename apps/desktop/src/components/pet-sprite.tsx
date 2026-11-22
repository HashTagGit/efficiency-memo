import React, { useEffect, useMemo, useState } from "react";
import type { DesktopPetSprite } from "../lib/desktop-pet-catalog";
import { PET_COLUMNS, PET_TRACKS, petAtlasRows } from "../lib/codex-pet";

export type PetPose = "idle" | "alert" | "greeting" | "working" | "waiting" | "sleeping" | "walk-left" | "walk-right";

const animationRows: Record<PetPose, number> = {
  idle: 0, alert: 4, greeting: 3, working: 7, waiting: 6, sleeping: 0, "walk-left": 2, "walk-right": 1,
};
const closedEyePets = new Set(["amber-cat", "lantern-moth", "pocket-robot"]);
const PEEK_PAUSE = 4200;
const PEEK_NOD = 240;

export function PetSprite({ pet, animated = false, pose = "idle", gaze = null, repeat = false, peekSide }: {
  pet: DesktopPetSprite;
  animated?: boolean;
  pose?: PetPose;
  gaze?: number | null;
  repeat?: boolean;
  peekSide?: "left" | "right" | null;
}) {
  const firstRow = animationRows[pose];
  const supportsLook = pet.manifest.spriteVersionNumber === 2;
  const look = gaze !== null && gaze >= 0 && gaze < 16 && supportsLook;
  const stationary = Boolean(peekSide) || look || pose === "sleeping";
  const [cell, setCell] = useState({ row: firstRow, column: 0 });
  const [nodding, setNodding] = useState(false);
  const backgroundImage = useMemo(() => `url(${JSON.stringify(pet.atlas)})`, [pet.atlas]);
  useEffect(() => {
    if (!animated || !peekSide || supportsLook) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    function pause() {
      setNodding(false);
      timer = window.setTimeout(() => {
        setNodding(true);
        timer = window.setTimeout(pause, PEEK_NOD);
      }, PEEK_PAUSE);
    }
    function sync() {
      window.clearTimeout(timer);
      setNodding(false);
      if (!document.hidden && !motion?.matches) pause();
    }
    sync();
    motion?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearTimeout(timer);
      motion?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [animated, peekSide, supportsLook]);

  useEffect(() => {
    if (!animated || stationary) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let row = firstRow;
    let column = 0;

    function advance() {
      const track = PET_TRACKS[row];
      column++;
      if (column === track.length) {
        if (!repeat && row === 4) row = 6;
        else if (!repeat && row === 3) row = 0;
        column = 0;
      }
      play();
    }
    function play() {
      setCell({ row, column });
      timer = window.setTimeout(advance, PET_TRACKS[row][column]);
    }
    function updateMotion() {
      window.clearTimeout(timer);
      if (motion?.matches) setCell({ row: pose === "alert" ? 6 : firstRow, column: 0 });
      else play();
    }

    updateMotion();
    motion?.addEventListener("change", updateMotion);
    return () => {
      window.clearTimeout(timer);
      motion?.removeEventListener("change", updateMotion);
    };
  }, [pose, animated, firstRow, stationary, repeat]);

  const rows = petAtlasRows(pet.manifest.spriteVersionNumber);
  const direction = look ? gaze : peekSide && supportsLook ? (peekSide === "left" ? 4 : 12) : null;
  const sleepingFrame = pose === "sleeping"
    ? pet.sleepingFrame ?? { row: 0, column: closedEyePets.has(pet.manifest.id) ? 3 : 0 }
    : null;
  const frame = direction !== null
    ? { row: PET_TRACKS.length + Math.floor(direction / PET_COLUMNS), column: direction % PET_COLUMNS }
    : peekSide ? { row: 0, column: 0 }
      : sleepingFrame ?? cell;
  return (
    <span
      aria-hidden="true"
      data-pose={peekSide ? "peeking" : look ? "looking" : pose}
      data-peek-nod={peekSide && nodding && !supportsLook ? "" : undefined}
      data-pet-frame={`${frame.row}:${frame.column}`}
      className="block h-full aspect-[12/13] [image-rendering:pixelated] bg-no-repeat"
      style={{
        backgroundImage,
        backgroundSize: `${PET_COLUMNS * 100}% ${rows * 100}%`,
        backgroundPosition: `${(frame.column / (PET_COLUMNS - 1)) * 100}% ${(frame.row / (rows - 1)) * 100}%`,
      }}
    />
  );
}
