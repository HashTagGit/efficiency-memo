import React, { useRef, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import {
  formatLocalPlanTime,
  transformPlanRange,
  type PlanRange,
  type PlanTransformMode,
} from "../plan-interaction";
import type { PlannedBlock } from "../planned-blocks";

export interface PlanPointerPosition {
  date: string;
  minute: number;
}

interface InteractivePlanBlockProps {
  plan: PlannedBlock;
  date: string;
  hourHeight: number;
  style: React.CSSProperties;
  compact?: boolean;
  availableDates: string[];
  resolvePointer: (clientX: number, clientY: number) => PlanPointerPosition;
  onEdit: (plan: PlannedBlock) => void;
  onUpdate: (plan: PlannedBlock, range: PlanRange) => Promise<void>;
}

interface Gesture {
  mode: PlanTransformMode;
  origin: PlanPointerPosition;
  originalStartMinute: number;
  preview: PlanRange | null;
}

function minuteOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function dateOf(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return formatLocalPlanTime(date).slice(0, 10);
}

function rangesEqual(left: PlanRange, right: PlanRange): boolean {
  return formatLocalPlanTime(left.startedAt) === formatLocalPlanTime(right.startedAt)
    && formatLocalPlanTime(left.endedAt) === formatLocalPlanTime(right.endedAt);
}

export function InteractivePlanBlock({
  plan,
  date,
  hourHeight,
  style,
  compact = false,
  availableDates,
  resolvePointer,
  onEdit,
  onUpdate,
}: InteractivePlanBlockProps) {
  const { locale, t } = useI18n();
  const gestureRef = useRef<Gesture | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const savingRef = useRef(false);
  const [preview, setPreview] = useState<PlanRange | null>(null);
  const [saving, setSaving] = useState(false);
  const original: PlanRange = {
    startedAt: new Date(plan.started_at),
    endedAt: new Date(plan.ended_at),
  };
  const visual = preview ?? original;
  const sourceDateIndex = availableDates.indexOf(date);
  const visualDateIndex = availableDates.indexOf(dateOf(visual.startedAt));
  const dayOffset = sourceDateIndex >= 0 && visualDateIndex >= 0
    ? visualDateIndex - sourceDateIndex
    : 0;
  const columnWidth = blockRef.current?.parentElement?.clientWidth ?? 0;
  const startMinute = minuteOf(visual.startedAt);
  const endMinute = minuteOf(visual.endedAt);
  const height = Math.max(24, (endMinute - startMinute) / 60 * hourHeight - 2);
  const title = plan.title.trim() || t("coreHour.untitledPlan");
  const editable = plan.status === "planned";
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const statusClass = plan.status === "planned"
    ? "border-dashed border-planned bg-planned/10 text-foreground"
    : plan.status === "completed"
      ? "border-planned/60 bg-planned/5 text-foreground opacity-60"
      : "border-dotted border-border bg-surface text-muted opacity-70";

  async function commit(range: PlanRange) {
    if (!editable || savingRef.current || rangesEqual(original, range)) {
      setPreview(null);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onUpdate(plan, range);
    } finally {
      setPreview(null);
      savingRef.current = false;
      setSaving(false);
    }
  }

  function beginGesture(
    mode: PlanTransformMode,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    if (!editable || savingRef.current) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = {
      mode,
      origin: resolvePointer(event.clientX, event.clientY),
      originalStartMinute: minuteOf(original.startedAt),
      preview: null,
    };
  }

  function updateGesture(event: React.PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    event.stopPropagation();
    const pointer = resolvePointer(event.clientX, event.clientY);
    const targetMinute = gesture.mode === "move"
      ? gesture.originalStartMinute + pointer.minute - gesture.origin.minute
      : pointer.minute;
    const range = transformPlanRange(
      { startedAt: original.startedAt, endedAt: original.endedAt },
      gesture.mode,
      gesture.mode === "move" ? pointer.date : dateOf(original.startedAt),
      targetMinute,
    );
    gesture.preview = rangesEqual(original, range) ? null : range;
    if (gesture.preview) event.preventDefault();
    setPreview(gesture.preview);
  }

  function endGesture(event: React.PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    event.stopPropagation();
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (gesture.preview) {
      event.preventDefault();
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      void commit(gesture.preview);
    }
  }

  function cancelGesture(event: React.PointerEvent<HTMLButtonElement>) {
    if (!gestureRef.current) return;
    event.stopPropagation();
    gestureRef.current = null;
    setPreview(null);
  }

  function moveByKeyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!editable || savingRef.current) return;
    const currentDate = dateOf(original.startedAt);
    const currentIndex = availableDates.indexOf(currentDate);
    let targetDate = currentDate;
    let targetMinute = minuteOf(original.startedAt);
    if (event.key === "ArrowUp") targetMinute -= 15;
    else if (event.key === "ArrowDown") targetMinute += 15;
    else if (event.key === "ArrowLeft" && currentIndex > 0) targetDate = availableDates[currentIndex - 1];
    else if (event.key === "ArrowRight" && currentIndex >= 0 && currentIndex < availableDates.length - 1) targetDate = availableDates[currentIndex + 1];
    else return;
    event.preventDefault();
    event.stopPropagation();
    void commit(transformPlanRange(original, "move", targetDate, targetMinute));
  }

  function resizeByKeyboard(
    mode: "resize-start" | "resize-end",
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (!editable || savingRef.current || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    event.stopPropagation();
    const currentMinute = mode === "resize-start"
      ? minuteOf(original.startedAt)
      : minuteOf(original.endedAt);
    const delta = event.key === "ArrowUp" ? -15 : 15;
    void commit(transformPlanRange(
      original,
      mode,
      dateOf(original.startedAt),
      currentMinute + delta,
    ));
  }

  return (
    <div
      ref={blockRef}
      className={"absolute z-10 overflow-visible rounded-md border transition-[filter,opacity,transform] " + statusClass}
      style={{
        ...style,
        top: startMinute / 60 * hourHeight,
        height,
        transform: dayOffset === 0 ? undefined : "translateX(" + dayOffset * columnWidth + "px)",
      }}
      data-plan-date={dateOf(visual.startedAt)}
      aria-busy={saving}
    >
      <button
        type="button"
        disabled={saving}
        className={
          "absolute inset-0 w-full overflow-hidden rounded-md px-2 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent "
          + (editable ? "touch-none select-none cursor-grab active:cursor-grabbing hover:brightness-105" : "cursor-default")
        }
        onPointerDown={(event) => beginGesture("move", event)}
        onPointerMove={updateGesture}
        onPointerUp={endGesture}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={cancelGesture}
        onKeyDown={moveByKeyboard}
        onClick={(event) => {
          event.stopPropagation();
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onEdit(plan);
        }}
        aria-label={t(editable ? "coreHour.movePlanNamed" : "coreHour.editPlanNamed", { title })}
      >
        <span className={"block truncate font-medium " + (compact ? "text-xs" : "text-sm")}>{title}</span>
        {height >= 38 && (
          <span className={"mt-0.5 block truncate tabular-nums opacity-75 " + (compact ? "text-[11px]" : "text-xs")}>
            {time.format(visual.startedAt)}{" - "}{time.format(visual.endedAt)}
            {dateOf(visual.startedAt) !== date && " · " + dateOf(visual.startedAt).slice(5)}
          </span>
        )}
        {height >= 52 && plan.tag_name && (
          <span className="mt-0.5 block truncate text-[11px] opacity-70">{plan.tag_name}</span>
        )}
      </button>
      {editable && (
        <>
          <button
            type="button"
            className="absolute -top-0.5 inset-x-1 z-20 flex h-2.5 touch-none select-none cursor-ns-resize items-center rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t("coreHour.resizePlanStartNamed", { title })}
            title={t("coreHour.resizePlanStartNamed", { title })}
            onPointerDown={(event) => beginGesture("resize-start", event)}
            onPointerMove={updateGesture}
            onPointerUp={endGesture}
            onPointerCancel={cancelGesture}
            onLostPointerCapture={cancelGesture}
            onKeyDown={(event) => resizeByKeyboard("resize-start", event)}
          >
            <span className="mx-auto block h-px w-6 bg-current opacity-40" />
          </button>
          <button
            type="button"
            className="absolute -bottom-0.5 inset-x-1 z-20 flex h-2.5 touch-none select-none cursor-ns-resize items-center rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t("coreHour.resizePlanEndNamed", { title })}
            title={t("coreHour.resizePlanEndNamed", { title })}
            onPointerDown={(event) => beginGesture("resize-end", event)}
            onPointerMove={updateGesture}
            onPointerUp={endGesture}
            onPointerCancel={cancelGesture}
            onLostPointerCapture={cancelGesture}
            onKeyDown={(event) => resizeByKeyboard("resize-end", event)}
          >
            <span className="mx-auto block h-px w-6 bg-current opacity-40" />
          </button>
        </>
      )}
    </div>
  );
}
