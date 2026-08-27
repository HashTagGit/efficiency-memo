import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TIMELINE_BOUNDS,
  layoutTimelineSessions,
  snapTimelineMinute,
} from "../timeline-layout";
import type { TodaySession } from "../today-data";
import { useI18n } from "../../../lib/i18n";
import { isoDay } from "../analytics";
import { layoutPlannedBlocks, type PlannedBlock } from "../planned-blocks";
import type { PlanRange } from "../plan-interaction";
import {
  InteractivePlanBlock,
  type PlanPointerPosition,
} from "./interactive-plan-block";

const HOUR_HEIGHT = 64;

interface DayTimelineProps {
  date: string;
  sessions: TodaySession[];
  plans: PlannedBlock[];
  onAddPlan: (startedAt: Date) => void;
  onEditPlan: (plan: PlannedBlock) => void;
  onUpdatePlan: (plan: PlannedBlock, range: PlanRange) => Promise<void>;
  onEditSession: (session: TodaySession) => void;
}

export function DayTimeline({ date, sessions, plans, onAddPlan, onEditPlan, onUpdatePlan, onEditSession }: DayTimelineProps) {
  const { locale, t } = useI18n();
  const bounds = TIMELINE_BOUNDS;
  const layout = layoutTimelineSessions(sessions, date, HOUR_HEIGHT);
  const planLayout = layoutPlannedBlocks(plans, date, HOUR_HEIGHT);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const hours = Array.from(
    { length: (bounds.endMinute - bounds.startMinute) / 60 + 1 },
    (_, index) => bounds.startMinute / 60 + index,
  );
  const canvasHeight = (bounds.endMinute - bounds.startMinute) / 60 * HOUR_HEIGHT;
  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const showNow = isoDay(now) === date;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const current = new Date();
    const targetMinute = isoDay(current) === date
      ? current.getHours() * 60 + current.getMinutes()
      : 8 * 60;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, targetMinute / 60 * HOUR_HEIGHT - 2 * HOUR_HEIGHT);
    }
  }, [date]);

  function addAtMinute(minute: number) {
    const startedAt = new Date(date + "T00:00:00");
    startedAt.setMinutes(minute);
    onAddPlan(startedAt);
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    const boundsRect = event.currentTarget.getBoundingClientRect();
    const minute = snapTimelineMinute(event.clientY - boundsRect.top, bounds.startMinute, HOUR_HEIGHT);
    addAtMinute(minute);
  }

  function handleCanvasKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const targetMinute = isoDay(now) === date ? nowMinute : 8 * 60;
    addAtMinute(snapTimelineMinute(targetMinute / 60 * HOUR_HEIGHT, bounds.startMinute, HOUR_HEIGHT));
  }

  function resolvePointer(_clientX: number, clientY: number): PlanPointerPosition {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      date,
      minute: rect ? (clientY - rect.top) / HOUR_HEIGHT * 60 : 0,
    };
  }

  return (
    <section aria-labelledby="timeline-heading">
      <div className="mb-3">
        <div>
          <h2 id="timeline-heading" className="text-base font-semibold text-foreground">{t("timeline.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("coreHour.planTimelineHint")}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div ref={scrollRef} className="max-h-[34rem] overflow-auto">
          <div ref={canvasRef} className="relative min-w-[28rem]" style={{ height: canvasHeight }}>
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                style={{ top: index * HOUR_HEIGHT }}
              >
                <span className="absolute left-3 top-0 -translate-y-1/2 bg-surface px-1 text-[11px] tabular-nums text-muted">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
            <div
              className="absolute bottom-0 left-16 right-0 top-0 cursor-crosshair focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              onClick={handleCanvasClick}
              onKeyDown={handleCanvasKeyDown}
              role="button"
              tabIndex={0}
              aria-label={t("coreHour.addPlan")}
            />
            {planLayout.map((item) => {
              return (
                <InteractivePlanBlock
                  key={item.plan.id}
                  plan={item.plan}
                  date={date}
                  hourHeight={HOUR_HEIGHT}
                  availableDates={[date]}
                  resolvePointer={resolvePointer}
                  onEdit={onEditPlan}
                  onUpdate={onUpdatePlan}
                  style={{
                    top: item.top,
                    height: item.height,
                    left: `calc(4.75rem + ${(item.lane / item.laneCount) * 43}%)`,
                    width: `calc(${43 / item.laneCount}% - 2px)`,
                  }}
                />
              );
            })}
            {layout.map((item) => {
              const color = item.session.tag_color ?? "var(--actual)";
              return (
                <button
                  key={item.session.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditSession(item.session);
                  }}
                  className="absolute right-4 z-10 overflow-hidden rounded-md border border-border border-l-4 px-3 py-1.5 text-left shadow-sm transition-[filter,transform] hover:-translate-y-px hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{
                    top: item.top,
                    height: item.height,
                    left: "calc(4.75rem + 45%)",
                    borderLeftColor: color,
                    backgroundColor: "color-mix(in srgb, " + color + " 14%, var(--surface))",
                  }}
                  aria-label={t("timeline.edit", { activity: item.session.activity || t("today.unnamed") })}
                >
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {item.session.activity || t("today.unnamed")}
                  </span>
                  {item.height >= 38 && (
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {formatter.format(new Date(item.session.started_at))}
                      {" – "}
                      {formatter.format(new Date(item.session.ended_at))}
                      {" · "}
                      {Math.round(item.session.elapsed_seconds / 60)} {t("coreHour.minutes")}
                    </span>
                  )}
                </button>
              );
            })}
            {showNow && (
              <div
                className="pointer-events-none absolute left-14 right-0 z-20 border-t border-info"
                style={{ top: (nowMinute - bounds.startMinute) / 60 * HOUR_HEIGHT }}
              >
                <span className="absolute -left-1 top-0 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-info" />
                <span className="absolute left-3 top-0 -translate-y-1/2 bg-surface px-1 text-[10px] font-medium text-info">
                  {t("timeline.now")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
