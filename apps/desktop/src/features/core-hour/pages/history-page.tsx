import React, { useEffect, useState } from "react";
import { Button } from "@memo/ui";
import { dbExecute, dbSelect } from "../../../lib/db";
import type { CheckInWithTag, Tag } from "../types";

type TagTotal = { name: string; color: string; duration_seconds: number };

const today = () => new Date().toISOString().slice(0, 10);

export default function HistoryPage({ userId }: { userId: string }) {
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<CheckInWithTag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [totals, setTotals] = useState<TagTotal[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagId, setTagId] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const [checkIns, availableTags, tagTotals] = await Promise.all([
      dbSelect<CheckInWithTag>(
        "SELECT ci.id, ci.session_id, ci.checked_at, ci.skipped, ci.note, ci.duration_seconds, ci.synced, e.tag_id, t.name AS tag_name, t.color AS tag_color FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id LEFT JOIN ch_check_in_entries e ON e.check_in_id = ci.id LEFT JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') = $2 ORDER BY ci.checked_at DESC",
        [userId, date],
      ),
      dbSelect<Tag>("SELECT * FROM ch_tags WHERE user_id = $1 AND is_archived = 0 ORDER BY created_at", [userId]),
      dbSelect<TagTotal>(
        "SELECT t.name, t.color, SUM(ci.duration_seconds) AS duration_seconds FROM ch_check_ins ci JOIN ch_sessions s ON s.id = ci.session_id JOIN ch_check_in_entries e ON e.check_in_id = ci.id JOIN ch_tags t ON t.id = e.tag_id WHERE s.user_id = $1 AND date(ci.checked_at, 'localtime') = $2 GROUP BY t.id, t.name, t.color ORDER BY duration_seconds DESC",
        [userId, date],
      ),
    ]);
    setEntries(checkIns.map((entry) => ({ ...entry, skipped: Boolean(entry.skipped), duration_seconds: Number(entry.duration_seconds) })));
    setTags(availableTags);
    setTotals(tagTotals.map((total) => ({ ...total, duration_seconds: Number(total.duration_seconds) })));
  }

  useEffect(() => { void load(); }, [date]); // userId is constant for the desktop profile.

  const totalSeconds = entries.reduce((sum, entry) => sum + entry.duration_seconds, 0);

  async function saveEntry(entry: CheckInWithTag) {
    await dbExecute("UPDATE ch_check_ins SET skipped = $1, note = $2, synced = 0 WHERE id = $3", [tagId ? 0 : 1, note.trim(), entry.id]);
    await dbExecute("DELETE FROM ch_check_in_entries WHERE check_in_id = $1", [entry.id]);
    if (tagId) {
      await dbExecute("INSERT INTO ch_check_in_entries (id, check_in_id, tag_id, percentage, synced) VALUES ($1, $2, $3, 100, 0)", [crypto.randomUUID(), entry.id, tagId]);
    }
    setEditingId(null);
    await load();
  }

  return (
    <div className="max-w-2xl space-y-6" data-testid="ch-history-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-lg font-semibold">Daily history</h1><p className="text-sm text-muted-foreground">{Math.round(totalSeconds / 60)} minutes recorded</p></div>
        <label className="text-sm font-medium">Date <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="ml-2 rounded-md border bg-background px-2 py-1" /></label>
      </div>
      {totals.length > 0 && <section><h2 className="mb-2 text-sm font-semibold">By tag</h2><ul className="flex flex-wrap gap-2">{totals.map((total) => <li key={total.name} className="rounded-md border px-3 py-2 text-sm"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: total.color }} />{total.name}: {Math.round(total.duration_seconds / 60)} min</li>)}</ul></section>}
      <section className="space-y-3"><h2 className="text-sm font-semibold">Check-ins</h2>
        {entries.map((entry) => <article key={entry.id} className="border-t py-3">
          {editingId === entry.id ? <div className="space-y-3">
            <select value={tagId} onChange={(event) => setTagId(event.target.value)} className="w-full rounded-md border bg-background p-2"><option value="">Uncategorized</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-20 w-full rounded-md border bg-background p-2" />
            <div className="flex gap-2"><Button type="button" size="sm" onClick={() => void saveEntry(entry)}>Save</Button><Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button></div>
          </div> : <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{entry.tag_name ?? "Uncategorized"} <span className="font-normal text-muted-foreground">{Math.round(entry.duration_seconds / 60)} min</span></p>{entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}</div><Button type="button" variant="secondary" size="sm" onClick={() => { setEditingId(entry.id); setTagId(entry.tag_id ?? ""); setNote(entry.note); }}>Edit</Button></div>}
        </article>)}
        {entries.length === 0 && <p className="text-sm text-muted-foreground">No check-ins for this date.</p>}
      </section>
    </div>
  );
}
