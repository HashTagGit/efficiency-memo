import React, { useCallback, useEffect, useState } from "react";
import { Button, PageHeader } from "@memo/ui";
import { dbExecute, dbSelect } from "../../../lib/db";
import type { CheckInWithTag, Tag } from "../types";
import { type ExportRange, rangeToFromDate, recordsToCsv, exportFilename } from "../export";
import { isoDay } from "../analytics";
import { useI18n } from "../../../lib/i18n";
import { SessionEditor } from "../components/session-editor";
import { loadSessionsForDay, type TodaySession } from "../today-data";
import { DayTimeline } from "../components/day-timeline";

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

  const load = useCallback(async () => {
    const [checkIns, availableTags, daySessions] = await Promise.all([
      dbSelect<CheckInWithTag>(
        "SELECT ci.id, ci.session_id, ci.checked_at, ci.skipped, ci.note, ci.duration_seconds, ci.synced, e.tag_id, t.name AS tag_name, t.color AS tag_color FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id LEFT JOIN ch_check_in_entries e ON e.check_in_id = ci.id LEFT JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') = $2 ORDER BY ci.checked_at DESC",
        [userId, date],
      ),
      dbSelect<Tag>("SELECT * FROM ch_tags WHERE user_id = $1 AND is_archived = 0 ORDER BY created_at", [userId]),
      loadSessionsForDay(userId, new Date(date + "T12:00:00")),
    ]);
    setEntries(checkIns.map((e) => ({ ...e, skipped: Boolean(e.skipped), duration_seconds: Number(e.duration_seconds) })));
    setTags(availableTags);
    setSessions(daySessions);
  }, [date, userId]);

  useEffect(() => { void load(); }, [load]);

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
  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="ch-history-page">
      <PageHeader
        title={t("coreHour.history")}
        subtitle={t("coreHour.historySubtitle", { minutes: Math.round(totalSeconds / 60), date })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => { setEditingSession(null); setEditorStart(null); setEditorOpen(true); }}
            >
              <span aria-hidden="true">+</span>
              {t("today.addTime")}
            </Button>
            <select
              value={exportRange}
              onChange={(ev) => setExportRange(ev.target.value as ExportRange)}
              className="rounded-lg border border-border bg-surface text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDate((current) => shiftDate(current, -1))}
            aria-label={t("timeline.previousDay")}
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
            onClick={() => setDate((current) => shiftDate(current, 1))}
            aria-label={t("timeline.nextDay")}
          >
            <ArrowIcon direction="right" />
          </Button>
        </div>
        <input
          type="date"
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
          className="rounded-lg border border-border bg-surface text-foreground px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label={t("coreHour.date")}
        />
      </div>

      <DayTimeline
        date={date}
        sessions={sessions}
        onAdd={(startedAt) => {
          setEditingSession(null);
          setEditorStart(startedAt);
          setEditorOpen(true);
        }}
        onEdit={(session) => {
          setEditingSession(session);
          setEditorStart(null);
          setEditorOpen(true);
        }}
      />

      <section className="space-y-2" data-testid="ch-history-entries">
        <h2 className="border-b border-border pb-2 text-sm font-semibold text-foreground">{t("coreHour.checkIns")}</h2>
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-border bg-surface px-4 py-3">
            {editingId === entry.id ? (
              <div className="space-y-3">
                <select
                  value={tagId}
                  onChange={(ev) => setTagId(ev.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">{t("coreHour.uncategorized")}</option>
                  {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
                <textarea
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
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
      </section>
      {editorOpen && (
        <SessionEditor
          key={editingSession?.id ?? editorStart?.toISOString() ?? "new"}
          isOpen
          userId={userId}
          session={editingSession}
          defaultDate={date}
          initialStartedAt={editorStart ?? undefined}
          initialEndedAt={editorStart ? new Date(editorStart.getTime() + 30 * 60_000) : undefined}
          tags={tags}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            await load();
          }}
        />
      )}
    </div>
  );
}
