import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TIMELINE_BOUNDS,
  layoutTimelineSessions,
  snapTimelineMinute,
} from "../timeline-layout";
import type { TodaySession } from "../today-data";
import { useI18n } from "../../../lib/i18n";
import { isoDay } from "../analytics";

const HOUR_HEIGHT = 64;

interface DayTimelineProps {
  date: string;
  sessions: TodaySession[];
  onAdd: (startedAt: Date) => void;
  onEdit: (session: TodaySession) => void;
}

export function DayTimeline({ date, sessions, onAdd, onEdit }: DayTimelineProps) {
  const { locale, t } = useI18n();
  const bounds = TIMELINE_BOUNDS;
  const layout = layoutTimelineSessions(sessions, date, HOUR_HEIGHT);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    onAdd(startedAt);
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

  return (
    <section aria-labelledby="timeline-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="timeline-heading" className="text-base font-semibold text-foreground">{t("timeline.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("timeline.hint")}</p>
        </div>
        <span className="text-sm text-muted">{sessions.length}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div ref={scrollRef} className="max-h-[34rem] overflow-y-auto">
          <div className="relative min-w-[28rem]" style={{ height: canvasHeight }}>
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
              aria-label={t("timeline.addAtTime")}
            />
            {layout.map((item) => {
              const color = item.session.tag_color ?? "var(--success)";
              return (
                <button
                  key={item.session.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(item.session);
                  }}
                  className="absolute left-20 right-4 z-10 overflow-hidden rounded-md border border-border border-l-4 px-3 py-1.5 text-left shadow-sm transition-[filter,transform] hover:-translate-y-px hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{
                    top: item.top,
                    height: item.height,
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
