import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button } from "@memo/ui";
import { useSession } from "../hooks/use-session";
import { useTags } from "../hooks/use-tags";
import type { TimerState } from "../hooks/use-timer";
import { requestCheckInNotifications } from "../notifications";
import {
  loadRecentActivities,
  loadTodaySessions,
  elapsedSecondsForDay,
  setActivityFavorite,
  type RecentActivity,
  type TodaySession,
} from "../today-data";
import type { Session } from "../types";
import { useI18n } from "../../../lib/i18n";
import { SessionEditor } from "./session-editor";

interface DashboardProps {
  userId: string;
  intervalMinutes: number;
  dailyGoalMinutes: number;
  timer: TimerState;
}

export function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l10-6.5L8 5.5Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 16-.8 4 4-.8L18.4 8 16 5.6 4 16Z" />
      <path d="m14.5 7.1 2.4 2.4" />
    </svg>
  );
}

export function Dashboard({ userId, intervalMinutes, dailyGoalMinutes, timer }: DashboardProps) {
  const { locale, t } = useI18n();
  const { activeSession, pendingCheckIn, startSession, completeCheckIn, endSession } = useSession();
  const { activeTags } = useTags();
  const [activity, setActivity] = useState("");
  const [defaultTagId, setDefaultTagId] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [note, setNote] = useState("");
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [completedSession, setCompletedSession] = useState<Session | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [resumeAfterCancel, setResumeAfterCancel] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TodaySession | null>(null);

  const refreshToday = useCallback(async () => {
    const [recent, sessions] = await Promise.all([
      loadRecentActivities(userId),
      loadTodaySessions(userId),
    ]);
    setRecentActivities(recent);
    setTodaySessions(sessions);
  }, [userId]);

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  useEffect(() => {
    if (!activeSession) return;
    setActivity(activeSession.activity);
    setDefaultTagId(activeSession.default_tag_id ?? "");
    setFavorite(activeSession.is_favorite);
  }, [activeSession]);

  useEffect(() => {
    if (activeSession) return;
    const match = recentActivities.find(
      (item) => item.activity === activity.trim() && item.default_tag_id === (defaultTagId || null),
    );
    setFavorite(Boolean(match?.is_favorite));
  }, [activeSession, activity, defaultTagId, recentActivities]);

  useEffect(() => {
    if (pendingCheckIn && activeSession?.default_tag_id) {
      setSelectedTagId((current) => current || activeSession.default_tag_id || "");
    }
  }, [activeSession?.default_tag_id, pendingCheckIn]);

  const tags = activeTags();
  const currentTag = tags.find((tag) => tag.id === (activeSession?.default_tag_id ?? defaultTagId));
  const completedTodaySeconds = todaySessions.reduce((sum, session) => sum + session.elapsed_seconds, 0);
  const now = new Date();
  const activeTodaySeconds = activeSession
    ? elapsedSecondsForDay(activeSession.started_at, now, timer.elapsed, now)
    : 0;
  const totalTodayMinutes = Math.round((completedTodaySeconds + activeTodaySeconds) / 60);
  const goalPercentage = Math.min(100, Math.round(totalTodayMinutes / dailyGoalMinutes * 100));
  const goalReached = totalTodayMinutes >= dailyGoalMinutes;
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
    [locale],
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  async function handleStart(preset?: RecentActivity) {
    const nextActivity = preset?.activity ?? activity;
    const nextTagId = preset?.default_tag_id ?? (defaultTagId || null);
    const nextFavorite = preset?.is_favorite ?? favorite;
    void requestCheckInNotifications();
    setCompletedSession(null);
    setActivity(nextActivity);
    setDefaultTagId(nextTagId ?? "");
    setFavorite(nextFavorite);
    await startSession({
      userId,
      intervalMinutes,
      activity: nextActivity,
      defaultTagId: nextTagId,
      favorite: nextFavorite,
    });
    timer.start();
  }

  function requestEnd() {
    setResumeAfterCancel(!timer.isPaused);
    if (!timer.isPaused) timer.pause();
    setConfirmingEnd(true);
  }

  function cancelEnd() {
    setConfirmingEnd(false);
    if (resumeAfterCancel) timer.resume();
  }

  async function confirmEnd() {
    const completed = await endSession(timer.elapsed, activeSession?.recorded_seconds ?? 0);
    timer.stop();
    setConfirmingEnd(false);
    if (completed) setCompletedSession(completed);
    await refreshToday();
  }

  async function handleCompleteCheckIn(tagId: string | null) {
    await completeCheckIn(tagId, note);
    setSelectedTagId("");
    setNote("");
  }

  async function handleFavorite(targetActivity: string, tagId: string | null, nextFavorite: boolean) {
    if (!targetActivity.trim()) return;
    await setActivityFavorite(userId, targetActivity, tagId, nextFavorite);
    if (completedSession?.activity === targetActivity && completedSession.default_tag_id === tagId) {
      setCompletedSession({ ...completedSession, is_favorite: nextFavorite });
    }
    if (!activeSession && activity === targetActivity && (defaultTagId || null) === tagId) {
      setFavorite(nextFavorite);
    }
    await refreshToday();
  }

  const completedTag = completedSession?.default_tag_id
    ? tags.find((tag) => tag.id === completedSession.default_tag_id)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="dashboard">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("today.title")}</h1>
          <p className="mt-1 text-sm text-muted">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-52" aria-label={t("today.goalProgress")}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-muted">{t("today.dailyGoal")}</span>
              <span className={"tabular-nums font-semibold " + (goalReached ? "text-success" : "text-foreground")}>
                {totalTodayMinutes} / {dailyGoalMinutes} {t("coreHour.minutes")}
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-background-soft"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={dailyGoalMinutes}
              aria-valuenow={Math.min(totalTodayMinutes, dailyGoalMinutes)}
            >
              <div
                className={"h-full rounded-full transition-[width] " + (goalReached ? "bg-success" : "bg-accent")}
                style={{ width: goalPercentage + "%" }}
              />
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={Boolean(activeSession)}
            onClick={() => { setEditingSession(null); setEditorOpen(true); }}
          >
            <PlusIcon />
            {t("today.addTime")}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm" aria-label={t("coreHour.focusSession")}>
          <div className="px-6 pb-8 pt-9 text-center" data-testid="timer-display">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t("coreHour.focusSession")}</p>
            <div className="mt-3 text-6xl font-bold tabular-nums tracking-tight text-foreground" data-testid="timer-value">
              {formatElapsed(timer.elapsed)}
            </div>
            <p className="mt-2 text-sm text-muted">
              {pendingCheckIn ? t("coreHour.checkInDue") : timer.isPaused ? t("coreHour.paused") : timer.isRunning ? t("coreHour.running") : t("coreHour.ready")}
            </p>

            {activeSession ? (
              <div className="mt-6">
                <p className="text-lg font-semibold text-foreground">{activeSession.activity || t("today.unnamed")}</p>
                {currentTag && (
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentTag.color }} aria-hidden="true" />
                    {currentTag.name}
                  </p>
                )}
              </div>
            ) : (
              <div className="mx-auto mt-7 grid max-w-xl gap-4 text-left sm:grid-cols-[minmax(0,1fr)_12rem]">
                <label className="text-sm font-medium text-foreground">
                  {t("today.activity")}
                  <input
                    value={activity}
                    onChange={(event) => { setActivity(event.target.value); setFavorite(false); }}
                    placeholder={t("today.activityPlaceholder")}
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  {t("today.defaultTag")}
                  <select
                    value={defaultTagId}
                    onChange={(event) => { setDefaultTagId(event.target.value); setFavorite(false); }}
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">{t("today.noTag")}</option>
                    {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>

          {pendingCheckIn ? (
            <div className="border-t border-border bg-background-soft px-6 py-5">
              <Alert variant="info" title={t("coreHour.whatWereYouDoing")} data-testid="ch-pending-check-in">
                <div className="space-y-4">
                  <p className="text-sm">{t("coreHour.recordLast", { duration: Math.ceil(pendingCheckIn.duration_seconds / 60) + " " + t("coreHour.minutes") })}</p>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2" aria-label={t("coreHour.chooseTag")}>
                      {tags.map((tag) => (
                        <Button key={tag.id} variant={selectedTagId === tag.id ? "primary" : "secondary"} size="sm" onClick={() => setSelectedTagId(tag.id)}>
                          {tag.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">{t("coreHour.createTag")}</p>
                  )}
                  <label className="block text-sm font-medium">
                    {t("coreHour.note")} <span className="font-normal text-muted">({t("coreHour.optional")})</span>
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("coreHour.addNote")} className="mt-1 min-h-20 w-full rounded-md border border-border bg-background p-2 text-foreground" />
                  </label>
                  <div className="flex gap-2">
                    <Button disabled={!selectedTagId} onClick={() => void handleCompleteCheckIn(selectedTagId)}>{t("coreHour.saveCheckIn")}</Button>
                    <Button variant="secondary" onClick={() => void handleCompleteCheckIn(null)}>{t("coreHour.skip")}</Button>
                  </div>
                </div>
              </Alert>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border bg-background-soft px-6 py-5" data-testid="timer-controls">
              {!activeSession && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFavorite((current) => !current)}
                    disabled={!activity.trim()}
                    className={"h-11 w-11 border border-border p-0 " + (favorite ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-strong hover:text-foreground")}
                    aria-label={favorite ? t("today.unfavorite") : t("today.favorite")}
                    aria-pressed={favorite}
                  >
                    <StarIcon filled={favorite} />
                  </Button>
                  <Button size="lg" onClick={() => void handleStart()} data-testid="start-button">{t("coreHour.start")}</Button>
                </>
              )}
              {activeSession && confirmingEnd && (
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{t("today.reviewSession")}</p>
                    <p className="mt-1 text-sm text-muted">{t("today.reviewSessionHint", {
                      activity: activeSession.activity || t("today.unnamed"),
                      duration: Math.round(timer.elapsed / 60) + " " + t("coreHour.minutes"),
                    })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={cancelEnd}>{t("today.keepWorking")}</Button>
                    <Button variant="danger" onClick={() => void confirmEnd()}>{t("today.confirmEnd")}</Button>
                  </div>
                </div>
              )}
              {activeSession && !confirmingEnd && !timer.isPaused && (
                <>
                  <Button variant="secondary" size="lg" onClick={timer.pause} data-testid="pause-button">{t("coreHour.pause")}</Button>
                  <Button variant="danger" size="lg" onClick={requestEnd} data-testid="stop-button">{t("coreHour.end")}</Button>
                </>
              )}
              {activeSession && !confirmingEnd && timer.isPaused && (
                <>
                  <Button size="lg" onClick={timer.resume} data-testid="resume-button">{t("coreHour.continue")}</Button>
                  <Button variant="danger" size="lg" onClick={requestEnd} data-testid="stop-button">{t("coreHour.end")}</Button>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="min-w-0" aria-label={t("today.quickStart")}>
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-semibold text-foreground">{t("today.quickStart")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t("today.quickStartHint")}</p>
          </div>
          {recentActivities.length === 0 ? (
            <p className="py-5 text-sm leading-relaxed text-muted">{t("today.noRecent")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivities.map((item) => (
                <li key={item.activity + ":" + (item.default_tag_id ?? "")} className="group flex items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.activity}</span>
                    {item.tag_name && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.tag_color ?? "var(--muted)" }} aria-hidden="true" />
                        {item.tag_name}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleFavorite(item.activity, item.default_tag_id, !item.is_favorite)}
                    disabled={Boolean(activeSession)}
                    className={"h-8 w-8 p-0 " + (item.is_favorite ? "text-accent" : "text-muted opacity-70 hover:bg-surface-strong hover:text-foreground")}
                    aria-label={item.is_favorite ? t("today.unfavorite") : t("today.favorite")}
                    aria-pressed={item.is_favorite}
                  >
                    <StarIcon filled={item.is_favorite} />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => void handleStart(item)}
                    disabled={Boolean(activeSession)}
                    className="h-8 w-8 p-0"
                    aria-label={t("today.startActivity", { activity: item.activity })}
                  >
                    <PlayIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {completedSession && (
        <Alert variant="success" title={t("today.sessionComplete")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm">{t("today.sessionCompleteHint", {
                activity: completedSession.activity || t("today.unnamed"),
                duration: Math.round(completedSession.elapsed_seconds / 60) + " " + t("coreHour.minutes"),
              })}</p>
              {completedTag && <p className="mt-1 text-xs text-muted">{completedTag.name}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleFavorite(completedSession.activity, completedSession.default_tag_id, !completedSession.is_favorite)}
                disabled={!completedSession.activity}
                className={"h-9 w-9 border border-border p-0 " + (completedSession.is_favorite ? "text-accent" : "text-muted hover:bg-surface-strong")}
                aria-label={completedSession.is_favorite ? t("today.unfavorite") : t("today.favorite")}
                aria-pressed={completedSession.is_favorite}
              >
                <StarIcon filled={completedSession.is_favorite} />
              </Button>
              <Button size="sm" onClick={() => setCompletedSession(null)}>{t("today.done")}</Button>
            </div>
          </div>
        </Alert>
      )}

      <section aria-labelledby="today-sessions-heading">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 id="today-sessions-heading" className="text-base font-semibold text-foreground">{t("today.sessions")}</h2>
          <span className="text-sm text-muted">{todaySessions.length}</span>
        </div>
        {todaySessions.length === 0 ? (
          <p className="py-8 text-sm text-muted">{t("today.noSessions")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {todaySessions.map((session) => (
              <li key={session.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto_auto]">
                <span className="col-start-1 row-start-2 text-xs tabular-nums text-muted sm:col-auto sm:row-auto">{timeFormatter.format(new Date(session.started_at))}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{session.activity || t("today.unnamed")}</p>
                  {session.tag_name && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: session.tag_color ?? "var(--muted)" }} aria-hidden="true" />
                      {session.tag_name}
                    </p>
                  )}
                </div>
                <span className="col-start-2 row-start-1 text-sm tabular-nums text-muted sm:col-auto sm:row-auto">{Math.round(session.elapsed_seconds / 60)} {t("coreHour.minutes")}</span>
                <div className="col-start-2 row-start-2 flex justify-self-end sm:col-auto sm:row-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={Boolean(activeSession)}
                    className="h-8 w-8 p-0 text-muted"
                    onClick={() => { setEditingSession(session); setEditorOpen(true); }}
                    aria-label={t("today.edit", { activity: session.activity || t("today.unnamed") })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleFavorite(session.activity, session.default_tag_id, !session.is_favorite)}
                    disabled={!session.activity || Boolean(activeSession)}
                    className={"h-8 w-8 p-0 " + (session.is_favorite ? "text-accent" : "text-muted hover:bg-surface-strong hover:text-foreground")}
                    aria-label={session.is_favorite ? t("today.unfavorite") : t("today.favorite")}
                    aria-pressed={session.is_favorite}
                  >
                    <StarIcon filled={session.is_favorite} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editorOpen && (
        <SessionEditor
          key={editingSession?.id ?? "new"}
          isOpen
          userId={userId}
          session={editingSession}
          tags={tags}
          onClose={() => setEditorOpen(false)}
          onSaved={refreshToday}
        />
      )}
    </div>
  );
}
