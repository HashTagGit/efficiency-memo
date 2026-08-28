import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, EmptyState, PageHeader } from "@memo/ui";
import { dbExecute, dbSelect } from "../../../lib/db";
import type { CheckInWithTag, Tag } from "../types";
import { type ExportRange, rangeToFromDate, recordsToCsv, exportFilename } from "../export";
import { buildPlanActualSummary, isoDay, weekDays } from "../analytics";
import { useI18n } from "../../../lib/i18n";
import { SessionEditor } from "../components/session-editor";
import {
  loadSessionsForDays,
  totalSessionSeconds,
  type TodaySession,
} from "../today-data";
import { DayTimeline } from "../components/day-timeline";
import { WeekTimeline } from "../components/week-timeline";
import { PlanEditor } from "../components/plan-editor";
import { PlanActualSummary } from "../components/plan-actual-summary";
import {
  loadPlansForRange,
  updatePlannedBlockRange,
  type PlannedBlock,
} from "../planned-blocks";
import { formatLocalPlanTime, type PlanRange } from "../plan-interaction";

const today = () => isoDay(new Date());

function shiftDate(value: string, days: number): string {
  const date = new Date(value + "T12:00:00");
  date.setDate(date.getDate() + days);
  return isoDay(date);
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

async function saveExport(csv: string, filename: string): Promise<void> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const path = await save({ defaultPath: filename, filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (path) await writeTextFile(path, csv);
}

export default function HistoryPage({ userId }: { userId: string }) {
  const { t } = useI18n();
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<CheckInWithTag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagId, setTagId] = useState("");
  const [note, setNote] = useState("");
  const [exportRange, setExportRange] = useState<ExportRange>("30d");
  const [exporting, setExporting] = useState(false);
  const [sessions, setSessions] = useState<TodaySession[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TodaySession | null>(null);
  const [editorStart, setEditorStart] = useState<Date | null>(null);
  const [sourcePlan, setSourcePlan] = useState<PlannedBlock | null>(null);
  const [plans, setPlans] = useState<PlannedBlock[]>([]);
  const [actualSeconds, setActualSeconds] = useState(0);
  const [planActionError, setPlanActionError] = useState<string | null>(null);
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedBlock | null>(null);
  const [planStart, setPlanStart] = useState<Date | null>(null);
  const [view, setView] = useState<"day" | "week">("day");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null);
  const loadRequestRef = useRef(0);
  const visibleDays = useMemo(
    () => view === "day" ? [date] : weekDays(new Date(date + "T12:00:00")),
    [date, view],
  );
  const visibleRangeKey = visibleDays.join(",");
  const visibleRangeRef = useRef(visibleRangeKey);
  visibleRangeRef.current = visibleRangeKey;

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    const sourceRange = visibleRangeKey;
    setLoading(true);
    setLoadFailed(false);
    const rangeStart = new Date(visibleDays[0] + "T00:00:00");
    const rangeEnd = new Date(visibleDays[visibleDays.length - 1] + "T00:00:00");
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    try {
      const [checkIns, availableTags, visibleSessions, visiblePlans] = await Promise.all([
        view === "day" ? dbSelect<CheckInWithTag>(
          "SELECT ci.id, ci.session_id, ci.checked_at, ci.skipped, ci.note, ci.duration_seconds, ci.synced, e.tag_id, t.name AS tag_name, t.color AS tag_color FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id LEFT JOIN ch_check_in_entries e ON e.check_in_id = ci.id LEFT JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') = $2 ORDER BY ci.checked_at DESC",
          [userId, date],
        ) : Promise.resolve([]),
        dbSelect<Tag>("SELECT * FROM ch_tags WHERE user_id = $1 AND is_archived = 0 ORDER BY created_at", [userId]),
        loadSessionsForDays(userId, visibleDays),
        loadPlansForRange(userId, rangeStart, rangeEnd),
      ]);
      if (request !== loadRequestRef.current || sourceRange !== visibleRangeRef.current) return false;
      setEntries(checkIns.map((e) => ({ ...e, skipped: Boolean(e.skipped), duration_seconds: Number(e.duration_seconds) })));
      setTags(availableTags);
      setSessions(Array.from(new Map(visibleSessions.flat().map((session) => [session.id, session])).values()));
      setActualSeconds(totalSessionSeconds(visibleSessions));
      setPlans(visiblePlans);
      setLoadedRangeKey(sourceRange);
      return true;
    } catch {
      if (request === loadRequestRef.current && sourceRange === visibleRangeRef.current) setLoadFailed(true);
      return false;
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [date, userId, view, visibleDays, visibleRangeKey]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPlanActionError(null); }, [visibleRangeKey]);

  async function saveEntry(entry: CheckInWithTag) {
    await dbExecute("UPDATE ch_check_ins SET skipped = $1, note = $2, synced = 0 WHERE id = $3", [tagId ? 0 : 1, note.trim(), entry.id]);
    await dbExecute("DELETE FROM ch_check_in_entries WHERE check_in_id = $1", [entry.id]);
    if (tagId) {
      await dbExecute("INSERT INTO ch_check_in_entries (id, check_in_id, tag_id, percentage, synced) VALUES ($1, $2, $3, 100, 0)", [crypto.randomUUID(), entry.id, tagId]);
    }
    setEditingId(null);
    await load();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const fromDate = rangeToFromDate(exportRange);
      const sql = fromDate
        ? "SELECT ci.checked_at, ci.duration_seconds, ci.skipped, ci.note, t.name AS tag_name FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id LEFT JOIN ch_check_in_entries e ON e.check_in_id = ci.id LEFT JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') >= $2 ORDER BY ci.checked_at DESC"
        : "SELECT ci.checked_at, ci.duration_seconds, ci.skipped, ci.note, t.name AS tag_name FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id LEFT JOIN ch_check_in_entries e ON e.check_in_id = ci.id LEFT JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 ORDER BY ci.checked_at DESC";
      const params = fromDate ? [userId, fromDate] : [userId];
      type ExportRow = { checked_at: string; duration_seconds: number; skipped: number; note: string; tag_name: string | null };
      const rows = await dbSelect<ExportRow>(sql, params);
      const records = rows.map((r) => ({ ...r, skipped: Boolean(r.skipped), duration_seconds: Number(r.duration_seconds), note: r.note ?? "" }));
      const csv = recordsToCsv(records);
      await saveExport(csv, exportFilename(exportRange));
    } finally {
      setExporting(false);
    }
  }

  const totalSeconds = entries.reduce((sum, e) => sum + e.duration_seconds, 0);
  const hasCurrentRange = loadedRangeKey === visibleRangeKey;
  const planActualSummary = useMemo(
    () => buildPlanActualSummary(plans, actualSeconds),
    [actualSeconds, plans],
  );
  const navigationStep = view === "day" ? 1 : 7;
  const openNewPlan = (startedAt: Date) => {
    setEditingPlan(null);
    setPlanStart(startedAt);
    setPlanEditorOpen(true);
  };
  const openNewSession = (startedAt: Date | null = null, plan: PlannedBlock | null = null) => {
    setEditingSession(null);
    setEditorStart(startedAt);
    setSourcePlan(plan);
    setEditorOpen(true);
  };
  const updatePlanRange = async (plan: PlannedBlock, range: PlanRange) => {
    const sourceRange = visibleRangeRef.current;
    setPlanActionError(null);
    try {
      await updatePlannedBlockRange({
        id: plan.id,
        userId,
        startedAt: formatLocalPlanTime(range.startedAt),
        endedAt: formatLocalPlanTime(range.endedAt),
      });
    } catch {
      if (visibleRangeRef.current !== sourceRange) return;
      setPlanActionError(t("coreHour.planMoveFailed"));
      await load();
      return;
    }
    if (visibleRangeRef.current !== sourceRange) return;
    setPlans((current) => current.map((item) => (
      item.id === plan.id
        ? {
            ...item,
            started_at: range.startedAt.toISOString(),
            ended_at: range.endedAt.toISOString(),
          }
        : item
    )));
    if (!await load()) {
      setPlanActionError(t("coreHour.planRefreshFailed"));
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="ch-history-page">
      <PageHeader
        title={t("coreHour.history")}
        subtitle={view === "day"
          ? hasCurrentRange
            ? t("coreHour.historySubtitle", { minutes: Math.round(totalSeconds / 60), date })
            : t("coreHour.historyDateSubtitle", { date })
          : t("coreHour.historyWeekSubtitle", { start: visibleDays[0], end: visibleDays[6] })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={!hasCurrentRange}
              onClick={() => openNewPlan(new Date(date + "T09:00:00"))}
            >
              <span aria-hidden="true">+</span>
              {t("coreHour.addPlan")}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!hasCurrentRange}
              onClick={() => openNewSession()}
            >
              <span aria-hidden="true">+</span>
              {t("today.addTime")}
            </Button>
            <select
              value={exportRange}
              onChange={(ev) => setExportRange(ev.target.value as ExportRange)}
              className="rounded-lg border border-control-border bg-surface text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-focus-ring"
              aria-label={t("coreHour.exportRange")}
            >
              <option value="7d">{t("coreHour.last7Days")}</option>
              <option value="30d">{t("coreHour.last30Days")}</option>
              <option value="all">{t("coreHour.allTime")}</option>
            </select>
            <Button variant="secondary" size="sm" isLoading={exporting} onClick={() => void handleExport()}>
              {t("coreHour.exportCsv")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-control-border p-0.5" role="group" aria-label={t("coreHour.timelineView")}>
            {(["day", "week"] as const).map((mode) => (
              <Button
                key={mode}
                variant={view === mode ? "primary" : "ghost"}
                size="sm"
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
              >
                {t(mode === "day" ? "coreHour.dayView" : "coreHour.weekView")}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDate((current) => shiftDate(current, -navigationStep))}
            aria-label={t(view === "day" ? "timeline.previousDay" : "coreHour.previousWeek")}
          >
            <ArrowIcon direction="left" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDate(today())}>
            {t("timeline.goToday")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDate((current) => shiftDate(current, navigationStep))}
            aria-label={t(view === "day" ? "timeline.nextDay" : "coreHour.nextWeek")}
          >
            <ArrowIcon direction="right" />
          </Button>
          </div>
        </div>
        <input
          type="date"
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
          className="rounded-lg border border-control-border bg-surface text-foreground px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
          aria-label={t("coreHour.date")}
        />
      </div>

      {loading && (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {t(hasCurrentRange ? "coreHour.timelineUpdating" : "coreHour.timelineLoading")}
        </p>
      )}
      {hasCurrentRange && loadFailed && (
        <Alert variant="error" title={t("coreHour.timelineLoadErrorTitle")}>
          <p>{t("coreHour.timelineRefreshErrorDescription")}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void load()}>{t("coreHour.retry")}</Button>
        </Alert>
      )}
      {!hasCurrentRange && !loading && loadFailed && (
        <EmptyState
          title={t("coreHour.timelineLoadErrorTitle")}
          description={t("coreHour.timelineLoadErrorDescription")}
          action={<Button onClick={() => void load()}>{t("coreHour.retry")}</Button>}
        />
      )}

      {hasCurrentRange && <>
      {planActionError && <Alert variant="error">{planActionError}</Alert>}

      <div aria-label={t("coreHour.timelineLegend")} className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm border border-dashed border-planned bg-planned/10" />{t("coreHour.planned")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm border-l-4 border-actual bg-actual/10" />{t("coreHour.actual")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm border border-dotted border-border" />{t("coreHour.skippedPlan")}</span>
      </div>

      {view === "day" ? (
        <DayTimeline
          date={date}
          sessions={sessions}
          plans={plans}
          onAddPlan={openNewPlan}
          onEditPlan={(plan) => { setEditingPlan(plan); setPlanStart(null); setPlanEditorOpen(true); }}
          onUpdatePlan={updatePlanRange}
          onEditSession={(session) => { setEditingSession(session); setEditorStart(null); setSourcePlan(null); setEditorOpen(true); }}
        />
      ) : (
        <>
          <PlanActualSummary summary={planActualSummary} />
          <WeekTimeline
            days={visibleDays}
            sessions={sessions}
            plans={plans}
            onAddPlan={openNewPlan}
            onEditPlan={(plan) => { setEditingPlan(plan); setPlanStart(null); setPlanEditorOpen(true); }}
            onUpdatePlan={updatePlanRange}
            onEditSession={(session) => { setEditingSession(session); setEditorStart(null); setSourcePlan(null); setEditorOpen(true); }}
          />
        </>
      )}

      {view === "day" && <section className="space-y-2" data-testid="ch-history-entries">
        <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">{t("coreHour.checkIns")}</h2>
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-border bg-surface px-4 py-3">
            {editingId === entry.id ? (
              <div className="space-y-3">
                <select
                  value={tagId}
                  onChange={(ev) => setTagId(ev.target.value)}
                  className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
                >
                  <option value="">{t("coreHour.uncategorized")}</option>
                  {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
                <textarea
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  className="min-h-20 w-full rounded-lg border border-control-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
                  placeholder={t("coreHour.addNote")}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void saveEntry(entry)}>{t("coreHour.save")}</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>{t("coreHour.cancel")}</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.tag_name ?? <span className="text-muted">{t("coreHour.uncategorized")}</span>}
                    <span className="ml-2 font-normal text-muted">{Math.round(entry.duration_seconds / 60)} {t("coreHour.minutes")}</span>
                  </p>
                  {entry.note && <p className="mt-0.5 text-sm text-muted">{entry.note}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditingId(entry.id); setTagId(entry.tag_id ?? ""); setNote(entry.note); }}>
                  {t("coreHour.edit")}
                </Button>
              </div>
            )}
          </article>
        ))}
        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">{t("coreHour.noCheckIns")}</p>
        )}
      </section>}
      {planEditorOpen && (
        <PlanEditor
          key={editingPlan?.id ?? planStart?.toISOString() ?? "new-plan"}
          isOpen
          userId={userId}
          plan={editingPlan}
          initialStartedAt={planStart ?? undefined}
          initialEndedAt={planStart ? new Date(planStart.getTime() + 30 * 60_000) : undefined}
          tags={tags}
          onClose={() => setPlanEditorOpen(false)}
          onSaved={async () => { await load(); }}
          onConvert={(plan) => openNewSession(new Date(plan.started_at), plan)}
        />
      )}
      {editorOpen && (
        <SessionEditor
          key={editingSession?.id ?? sourcePlan?.id ?? editorStart?.toISOString() ?? "new"}
          isOpen
          userId={userId}
          session={editingSession}
          defaultDate={date}
          initialStartedAt={editorStart ?? undefined}
          initialEndedAt={sourcePlan ? new Date(sourcePlan.ended_at) : editorStart ? new Date(editorStart.getTime() + 30 * 60_000) : undefined}
          initialActivity={sourcePlan?.title}
          initialTagId={sourcePlan?.tag_id}
          sourcePlanId={sourcePlan?.id}
          tags={tags}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            await load();
          }}
        />
      )}
      </>}
    </div>
  );
}
