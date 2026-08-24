import React, { useCallback, useEffect, useState } from "react";
import { Button, PageHeader } from "@memo/ui";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dbExecute, dbSelect } from "../../../lib/db";
import type { CheckInWithTag, Tag } from "../types";
import { type ExportRange, rangeToFromDate, recordsToCsv, exportFilename } from "../export";
import { buildTagSlices, buildTrend, rangeDays, summarize, type DailyRow, type TagRow, type TrendRange } from "../analytics";

const today = () => new Date().toISOString().slice(0, 10);

async function saveExport(csv: string, filename: string): Promise<void> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const path = await save({ defaultPath: filename, filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (path) await writeTextFile(path, csv);
}

export default function HistoryPage({ userId }: { userId: string }) {
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<CheckInWithTag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<TrendRange>("7d");
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [tagRows, setTagRows] = useState<TagRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagId, setTagId] = useState("");
  const [note, setNote] = useState("");
  const [exportRange, setExportRange] = useState<ExportRange>("30d");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [checkIns, availableTags] = await Promise.all([
      dbSelect<CheckInWithTag>(
        "SELECT ci.id, ci.session_id, ci.checked_at, ci.skipped, ci.note, ci.duration_seconds, ci.synced, e.tag_id, t.name AS tag_name, t.color AS tag_color FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id LEFT JOIN ch_check_in_entries e ON e.check_in_id = ci.id LEFT JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') = $2 ORDER BY ci.checked_at DESC",
        [userId, date],
      ),
      dbSelect<Tag>("SELECT * FROM ch_tags WHERE user_id = $1 AND is_archived = 0 ORDER BY created_at", [userId]),
    ]);
    setEntries(checkIns.map((e) => ({ ...e, skipped: Boolean(e.skipped), duration_seconds: Number(e.duration_seconds) })));
    setTags(availableTags);
  }, [date, userId]);

  useEffect(() => { void load(); }, [load]);

  const loadAnalytics = useCallback(async () => {
    const fromDate = rangeDays(analyticsRange)[0];
    const [daily, byTag] = await Promise.all([
      dbSelect<DailyRow>(
        "SELECT date(ci.checked_at, 'localtime') AS day, SUM(ci.duration_seconds) AS duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') >= $2 GROUP BY day ORDER BY day",
        [userId, fromDate],
      ),
      dbSelect<TagRow>(
        "SELECT t.name, t.color, SUM(ci.duration_seconds) AS duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id JOIN ch_check_in_entries e ON e.check_in_id = ci.id JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') >= $2 GROUP BY t.id, t.name, t.color ORDER BY duration_seconds DESC",
        [userId, fromDate],
      ),
    ]);
    setDailyRows(daily);
    setTagRows(byTag);
  }, [analyticsRange, userId]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

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
  const trend = buildTrend(dailyRows, analyticsRange);
  const summary = summarize(trend);
  const tagSlices = buildTagSlices(tagRows);

  return (
    <div className="max-w-2xl space-y-6" data-testid="ch-history-page">
      <PageHeader
        title="History"
        subtitle={`${Math.round(totalSeconds / 60)} min recorded on ${date}`}
        action={
          <div className="flex items-center gap-2">
            <select
              value={exportRange}
              onChange={(ev) => setExportRange(ev.target.value as ExportRange)}
              className="rounded-lg border border-border bg-surface text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Export range"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <Button variant="secondary" size="sm" isLoading={exporting} onClick={() => void handleExport()}>
              Export CSV
            </Button>
          </div>
        }
      />

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        Date
        <input
          type="date"
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
          className="rounded-lg border border-border bg-surface text-foreground px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      <section className="space-y-4" data-testid="ch-history-analytics" aria-label="CoreHour analytics">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Focus overview</h2>
            <p className="text-sm text-muted">Daily totals and tag share for the selected period.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            Range
            <select
              value={analyticsRange}
              onChange={(ev) => setAnalyticsRange(ev.target.value as TrendRange)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Analytics range"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["Total", `${summary.totalMinutes} min`],
            ["Active days", String(summary.activeDays)],
            ["Daily average", `${summary.dailyAverage} min`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <p className="mb-2 text-xs font-medium text-muted">Minutes per day</p>
          <div className="h-52 w-full" aria-label="Daily minutes line chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip contentStyle={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                <Line type="monotone" dataKey="minutes" name="Minutes" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2, fill: "var(--accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <p className="mb-3 text-xs font-medium text-muted">Tag share</p>
          {tagSlices.length > 0 ? (
            <div className="space-y-2">
              {tagSlices.map((slice) => (
                <div key={slice.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{slice.name}</span>
                  <span className="text-muted">{slice.minutes} min</span>
                  <span className="w-10 text-right text-muted">{slice.percentage}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No tagged check-ins in this period.</p>
          )}
        </div>
      </section>

      <section className="space-y-2" data-testid="ch-history-entries">
        <h2 className="text-sm font-semibold text-foreground">Check-ins</h2>
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-border bg-surface px-4 py-3">
            {editingId === entry.id ? (
              <div className="space-y-3">
                <select
                  value={tagId}
                  onChange={(ev) => setTagId(ev.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Uncategorized</option>
                  {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
                <textarea
                  value={note}
                  onChange={(ev) => setNote(ev.target.value)}
                  className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Add a note…"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void saveEntry(entry)}>Save</Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.tag_name ?? <span className="text-muted">Uncategorized</span>}
                    <span className="ml-2 font-normal text-muted">{Math.round(entry.duration_seconds / 60)} min</span>
                  </p>
                  {entry.note && <p className="mt-0.5 text-sm text-muted">{entry.note}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEditingId(entry.id); setTagId(entry.tag_id ?? ""); setNote(entry.note); }}>
                  Edit
                </Button>
              </div>
            )}
          </article>
        ))}
        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No check-ins for this date.</p>
        )}
      </section>
    </div>
  );
}
