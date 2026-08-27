import React, { useState } from "react";
import { Alert, Button, Input, Modal } from "@memo/ui";
import { savePlannedBlock, skipPlannedBlock, type PlannedBlock } from "../planned-blocks";
import type { Tag } from "../types";
import { useI18n } from "../../../lib/i18n";

interface PlanEditorProps {
  isOpen: boolean;
  userId: string;
  plan: PlannedBlock | null;
  initialStartedAt?: Date;
  initialEndedAt?: Date;
  tags: Tag[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onConvert: (plan: PlannedBlock) => void;
}

function toLocalInput(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function PlanEditor({ isOpen, userId, plan, initialStartedAt, initialEndedAt, tags, onClose, onSaved, onConvert }: PlanEditorProps) {
  const { t } = useI18n();
  const defaultStart = initialStartedAt ?? new Date();
  const defaultEnd = initialEndedAt ?? new Date(defaultStart.getTime() + 30 * 60_000);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [tagId, setTagId] = useState(plan?.tag_id ?? "");
  const [startedAt, setStartedAt] = useState(toLocalInput(plan?.started_at ?? defaultStart));
  const [endedAt, setEndedAt] = useState(toLocalInput(plan?.ended_at ?? defaultEnd));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "skip" | null>(null);

  const readOnly = plan !== null && plan.status !== "planned";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || busy) return;
    setError(null);
    setBusy("save");
    try {
      await savePlannedBlock({
        id: plan?.id,
        userId,
        title,
        tagId: tagId || null,
        startedAt,
        endedAt,
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        message === "invalid-range"
          ? t("coreHour.planInvalidRange")
          : message === "cross-day"
            ? t("coreHour.planCrossDay")
            : message === "plan-not-available"
              ? t("coreHour.planNotAvailable")
            : t("coreHour.planSaveFailed"),
      );
      setBusy(null);
      return;
    }
    setBusy(null);
    onClose();
    try {
      await onSaved();
    } catch {
      // The database commit succeeded; the next page load will refresh the view.
    }
  }

  async function handleSkip() {
    if (!plan || busy) return;
    setError(null);
    setBusy("skip");
    try {
      await skipPlannedBlock(userId, plan.id);
    } catch {
      setError(t("coreHour.planSaveFailed"));
      setBusy(null);
      return;
    }
    setBusy(null);
    onClose();
    try {
      await onSaved();
    } catch {
      // The database commit succeeded; the next page load will refresh the view.
    }
  }

  function handleConvert() {
    if (!plan || busy) return;
    onClose();
    onConvert(plan);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!busy) onClose(); }}
      title={t(plan ? "coreHour.editPlan" : "coreHour.addPlan")}
      closeLabel={t("coreHour.closePlanEditor")}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}
        <Input
          label={t("coreHour.planTitle")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("coreHour.planTitlePlaceholder")}
          disabled={readOnly}
          autoFocus={!readOnly}
        />
        <label className="block text-sm font-medium text-foreground">
          {t("coreHour.planTag")}
          <select
            value={tagId}
            onChange={(event) => setTagId(event.target.value)}
            disabled={readOnly}
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t("coreHour.noPlanTag")}</option>
            {plan?.tag_id && !tags.some((tag) => tag.id === plan.tag_id) && (
              <option value={plan.tag_id}>{plan.tag_name ?? plan.tag_id}</option>
            )}
            {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("coreHour.planStart")}
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            disabled={readOnly}
          />
          <Input
            label={t("coreHour.planEnd")}
            type="datetime-local"
            value={endedAt}
            onChange={(event) => setEndedAt(event.target.value)}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          {plan && plan.status === "planned" && (
            <>
              <Button type="button" variant="secondary" disabled={busy !== null} onClick={handleConvert}>
                {t("coreHour.convertPlan")}
              </Button>
              <Button type="button" variant="ghost" disabled={busy !== null} isLoading={busy === "skip"} onClick={handleSkip}>
                {t("coreHour.skipPlan")}
              </Button>
            </>
          )}
          <Button type="button" variant="secondary" disabled={busy !== null} onClick={onClose}>
            {t("coreHour.cancel")}
          </Button>
          {!readOnly && (
            <Button type="submit" isLoading={busy === "save"} disabled={busy !== null}>
              {t("coreHour.savePlan")}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
