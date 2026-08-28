import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TIMELINE_BOUNDS,
  layoutTimelineSessions,
  snapTimelineMinute,
} from "../timeline-layout";
import { layoutPlannedBlocks, type PlannedBlock } from "../planned-blocks";
import type { TodaySession } from "../today-data";
import { useI18n } from "../../../lib/i18n";
import { isoDay } from "../analytics";
import type { PlanRange } from "../plan-interaction";
import {
  InteractivePlanBlock,
  type PlanPointerPosition,
} from "./interactive-plan-block";

const HOUR_HEIGHT = 48;

interface WeekTimelineProps {
  days: string[];
  sessions: TodaySession[];
  plans: PlannedBlock[];
  onAddPlan: (startedAt: Date) => void;
  onEditPlan: (plan: PlannedBlock) => void;
  onUpdatePlan: (plan: PlannedBlock, range: PlanRange) => Promise<void>;
  onEditSession: (session: TodaySession) => void;
}

function overlapsDay(startedAt: string, endedAt: string, day: string): boolean {
  const dayStart = new Date(day + "T00:00:00");
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return new Date(startedAt).getTime() < dayEnd.getTime() && new Date(endedAt).getTime() > dayStart.getTime();
}

export function WeekTimeline({ days, sessions, plans, onAddPlan, onEditPlan, onUpdatePlan, onEditSession }: WeekTimelineProps) {
  const { locale, t } = useI18n();
  const bounds = TIMELINE_BOUNDS;
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayColumnsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [now, setNow] = useState(() => new Date());
  const hours = Array.from(
    { length: (bounds.endMinute - bounds.startMinute) / 60 + 1 },
    (_, index) => bounds.startMinute / 60 + index,
  );
  const canvasHeight = (bounds.endMinute - bounds.startMinute) / 60 * HOUR_HEIGHT;
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }), [locale]);
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);

  const todayKey = isoDay(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const daysKey = days.join(",");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const current = new Date();
    const currentMinute = current.getHours() * 60 + current.getMinutes();
    scrollRef.current.scrollTop = days.includes(isoDay(current))
      ? Math.max(0, (currentMinute / 60 - 2) * HOUR_HEIGHT)
      : 8 * HOUR_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysKey]);

  function addAtMinute(day: string, minute: number) {
    const startedAt = new Date(day + "T00:00:00");
    startedAt.setMinutes(minute);
    onAddPlan(startedAt);
  }

  function handleCanvasClick(day: string, event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const minute = snapTimelineMinute(event.clientY - rect.top, bounds.startMinute, HOUR_HEIGHT);
    addAtMinute(day, minute);
  }

  function handleCanvasKeyDown(day: string, event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const targetMinute = isoDay(now) === day ? now.getHours() * 60 + now.getMinutes() : 8 * 60;
    addAtMinute(day, snapTimelineMinute(targetMinute / 60 * HOUR_HEIGHT, bounds.startMinute, HOUR_HEIGHT));
  }

  function resolvePointer(clientX: number, clientY: number): PlanPointerPosition {
    const available = days
      .map((day) => ({ day, element: dayColumnsRef.current[day] }))
      .filter((entry): entry is { day: string; element: HTMLDivElement } => Boolean(entry.element));
    const selected = available.find(({ element }) => {
      const rect = element.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    }) ?? (clientX < (available[0]?.element.getBoundingClientRect().left ?? 0)
      ? available[0]
      : available[available.length - 1]);
    const rect = selected?.element.getBoundingClientRect();
    return {
      date: selected?.day ?? days[0],
      minute: rect ? (clientY - rect.top) / HOUR_HEIGHT * 60 : 0,
    };
  }

  return (
    <section aria-label={t("coreHour.weekTimeline")}>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div ref={scrollRef} className="max-h-[34rem] overflow-auto">
          <div className="min-w-[56rem]">
            <div className="sticky top-0 z-30 grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border bg-surface">
              <div aria-hidden="true" />
              {days.map((day) => {
                const date = new Date(day + "T00:00:00");
                const isToday = day === todayKey;
                return (
                  <div key={day} className="border-l border-border px-2 py-2 text-center">
                    <span className={"block text-xs font-medium " + (isToday ? "text-accent" : "text-muted")}>
                      {weekdayFormatter.format(date)}
                    </span>
                    <span className={"block text-sm tabular-nums " + (isToday ? "font-semibold text-accent" : "text-foreground")}>
                      {dateFormatter.format(date)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
              <div className="relative" style={{ height: canvasHeight }} aria-hidden="true">
                {hours.map((hour, index) => (
                  <span
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted"
                    style={{ top: index * HOUR_HEIGHT }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              {days.map((day) => {
                const dayPlans = layoutPlannedBlocks(
                  plans.filter((plan) => overlapsDay(plan.started_at, plan.ended_at, day)),
                  day,
                  HOUR_HEIGHT,
                );
                const daySessions = layoutTimelineSessions(
                  sessions.filter((session) => overlapsDay(session.started_at, session.ended_at, day)),
                  day,
                  HOUR_HEIGHT,
                );
                const isToday = day === todayKey;
                return (
                  <div
                    key={day}
                    ref={(element) => { dayColumnsRef.current[day] = element; }}
                    className="relative border-l border-border"
                    style={{ height: canvasHeight }}
                  >
                    {hours.map((hour, index) => (
                      <div
                        key={hour}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 border-t border-border/70"
                        style={{ top: index * HOUR_HEIGHT }}
                      />
                    ))}
                    <div
                      className="absolute inset-0 cursor-crosshair focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
                      role="button"
                      tabIndex={0}
                      aria-label={t("coreHour.addPlan")}
                      onClick={(event) => handleCanvasClick(day, event)}
                      onKeyDown={(event) => handleCanvasKeyDown(day, event)}
                    />
                    {dayPlans.map((item) => {
                      const plan = item.plan;
                      return (
                        <InteractivePlanBlock
                          key={plan.id}
                          plan={plan}
                          date={day}
                          hourHeight={HOUR_HEIGHT}
                          compact
                          availableDates={days}
                          resolvePointer={resolvePointer}
                          onEdit={onEditPlan}
                          onUpdate={onUpdatePlan}
                          style={{
                            top: item.top,
                            height: item.height,
                            left: `calc(${(item.lane / item.laneCount) * 48}% + 1px)`,
                            width: `calc(${48 / item.laneCount}% - 2px)`,
                          }}
                        />
                      );
                    })}
                    {daySessions.map((item) => {
                      const color = item.session.tag_color ?? "var(--actual)";
                      const title = item.session.activity || t("today.unnamed");
                      return (
                        <button
                          key={item.session.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditSession(item.session);
                          }}
                          className="absolute z-10 overflow-hidden rounded-md border border-border border-l-4 px-2 py-1 text-left shadow-sm transition-[filter] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                          style={{
                            top: item.top,
                            height: item.height,
                            left: "50%",
                            right: "0.25rem",
                            borderLeftColor: color,
                            backgroundColor: "color-mix(in srgb, " + color + " 16%, var(--surface))",
                          }}
                          aria-label={t("coreHour.editActualNamed", { title })}
                        >
                          <span className="block truncate text-xs font-semibold text-foreground">{title}</span>
                          {item.height >= 34 && (
                            <span className="mt-0.5 block truncate text-[11px] tabular-nums text-muted">
                              {timeFormatter.format(new Date(item.session.started_at))}
                              {" – "}
                              {timeFormatter.format(new Date(item.session.ended_at))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {isToday && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 z-20 border-t border-info"
                        style={{ top: (nowMinute - bounds.startMinute) / 60 * HOUR_HEIGHT }}
                      >
                        <span className="absolute left-0 top-0 h-2 w-2 -translate-y-1/2 rounded-full bg-info" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
