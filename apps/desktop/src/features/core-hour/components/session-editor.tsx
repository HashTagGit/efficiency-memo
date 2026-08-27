import React, { useState } from "react";
import { Alert, Button, Input, Modal } from "@memo/ui";
import { saveSessionBlock, SessionBlockError } from "../session-editor-data";
import type { TodaySession } from "../today-data";
import type { Tag } from "../types";
import { useI18n } from "../../../lib/i18n";

interface SessionEditorProps {
  isOpen: boolean;
  userId: string;
  session: TodaySession | null;
  defaultDate?: string;
  tags: Tag[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function toLocalInput(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function SessionEditor({ isOpen, userId, session, defaultDate, tags, onClose, onSaved }: SessionEditorProps) {
  const { t } = useI18n();
  const now = new Date();
  let defaultEnd = defaultDate
    ? new Date(defaultDate + "T" + toLocalInput(now).slice(11))
    : now;
  const dayStart = new Date(defaultEnd);
  dayStart.setHours(0, 0, 0, 0);
  const defaultStart = new Date(Math.max(dayStart.getTime(), defaultEnd.getTime() - 30 * 60_000));
  if (defaultStart.getTime() === defaultEnd.getTime()) {
    defaultEnd = new Date(defaultEnd.getTime() + 30 * 60_000);
  }
  const initialStartedAt = toLocalInput(session?.started_at ?? defaultStart);
  const initialEndedAt = toLocalInput(session?.ended_at ?? defaultEnd);
  const initialTagId = session?.default_tag_id ?? "";
  const [activity, setActivity] = useState(session?.activity ?? "");
  const [tagId, setTagId] = useState(initialTagId);
  const [startedAt, setStartedAt] = useState(initialStartedAt);
  const [endedAt, setEndedAt] = useState(initialEndedAt);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveSessionBlock({
        id: session?.id,
        userId,
        activity,
        defaultTagId: tagId || null,
        startedAt,
        endedAt,
        adjustDuration: startedAt !== initialStartedAt || endedAt !== initialEndedAt,
        adjustTag: tagId !== initialTagId,
      });
    } catch (caught) {
      if (caught instanceof SessionBlockError) {
        const errorKey = caught.code === "overlap"
          ? "today.overlap"
          : caught.code === "cross-day"
            ? "today.crossDay"
            : "today.invalidRange";
        setError(t(errorKey));
      } else {
        setError(t("today.saveFailed"));
      }
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
    try {
      await onSaved();
    } catch {
      // The database commit succeeded; the next page load will refresh the view.
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!saving) onClose(); }}
      title={t(session ? "today.editSession" : "today.addSession")}
      closeLabel={t("today.closeEditor")}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}
        <Input
          label={t("today.activity")}
          value={activity}
          onChange={(event) => setActivity(event.target.value)}
          placeholder={t("today.activityPlaceholder")}
          autoFocus
        />
        <label className="block text-sm font-medium text-foreground">
          {t(session ? "today.sessionTag" : "today.defaultTag")}
          <select
            value={tagId}
            onChange={(event) => setTagId(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">{t("today.noTag")}</option>
            {session?.default_tag_id && !tags.some((tag) => tag.id === session.default_tag_id) && (
              <option value={session.default_tag_id}>{session.tag_name ?? session.default_tag_id}</option>
            )}
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("today.startTime")}
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
          />
          <Input
            label={t("today.endTime")}
            type="datetime-local"
            value={endedAt}
            onChange={(event) => setEndedAt(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>{t("coreHour.cancel")}</Button>
          <Button type="submit" isLoading={saving}>{t("today.saveSession")}</Button>
        </div>
      </form>
    </Modal>
  );
}
