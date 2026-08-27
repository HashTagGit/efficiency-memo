import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, PageHeader } from "@memo/ui";
import { useI18n } from "../../../lib/i18n";
import { usePauseHydrate } from "../context";
import { REMINDER_KINDS, type ReminderAction, type ReminderKind } from "../types";

type DraftPreferences = Record<ReminderKind, { enabled: boolean; intervalMinutes: number }>;

const emptyDraft: DraftPreferences = {
  break: { enabled: false, intervalMinutes: 60 },
  hydration: { enabled: false, intervalMinutes: 45 },
};

export default function PauseHydratePage() {
  const { locale, t } = useI18n();
  const { state, loading, savePreferences, act } = usePauseHydrate();
  const [draft, setDraft] = useState<DraftPreferences>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [actingKind, setActingKind] = useState<ReminderKind | null>(null);
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  useEffect(() => {
    if (!state || dirty) return;
    setDraft({
      break: {
        enabled: state.reminders.break.enabled,
        intervalMinutes: state.reminders.break.intervalMinutes,
      },
      hydration: {
        enabled: state.reminders.hydration.enabled,
        intervalMinutes: state.reminders.hydration.intervalMinutes,
      },
    });
  }, [dirty, state]);

  function updateDraft(kind: ReminderKind, value: Partial<DraftPreferences[ReminderKind]>) {
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], ...value } }));
    setDirty(true);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await savePreferences(REMINDER_KINDS.map((kind) => ({ kind, ...draft[kind] })));
      setDirty(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(kind: ReminderKind, action: ReminderAction) {
    setActingKind(kind);
    try {
      await act(kind, action);
    } finally {
      setActingKind(null);
    }
  }

  function nextStatus(kind: ReminderKind): string {
    const reminder = state?.reminders[kind];
    if (!reminder || !draft[kind].enabled) return t("pauseHydrate.off");
    if (reminder.pendingAt) return t("pauseHydrate.dueNow");
    if (state?.coreHourActive && reminder.nextDueAt && new Date(reminder.nextDueAt) <= new Date()) {
      return t("pauseHydrate.waitingForFocus");
    }
    if (!reminder.nextDueAt) return t("pauseHydrate.off");
    const next = new Date(reminder.nextDueAt);
    return Number.isFinite(next.getTime()) ? dateTime.format(next) : t("pauseHydrate.off");
  }

  if (loading || !state) {
    return <p className="py-16 text-center text-sm text-muted">{t("app.loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7" data-testid="pause-hydrate-page">
      <PageHeader
        title={t("pauseHydrate.title")}
        subtitle={t("pauseHydrate.subtitle")}
        action={
          <div className="max-w-64 border-l-2 border-info pl-3">
            <p className="text-xs font-semibold text-info">{t("pauseHydrate.localOnly")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t("pauseHydrate.localOnlyHint")}</p>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {REMINDER_KINDS.map((kind) => {
          const reminder = state.reminders[kind];
          const pending = Boolean(reminder.pendingAt);
          const accent = kind === "break" ? "border-t-warning" : "border-t-info";
          return (
            <section key={kind} className={`rounded-lg border border-border border-t-2 ${accent} bg-surface p-5`} aria-labelledby={`${kind}-heading`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={`${kind}-heading`} className="text-base font-semibold text-foreground">{t(`pauseHydrate.${kind}`)}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(`pauseHydrate.${kind}Description`)}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={draft[kind].enabled}
                    onChange={(event) => updateDraft(kind, { enabled: event.target.checked })}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {t("pauseHydrate.enabled")}
                </label>
              </div>

              <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <label className="text-sm font-medium text-foreground">
                  {t("pauseHydrate.interval")}
                  <span className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min={15}
                      max={240}
                      step={15}
                      disabled={!draft[kind].enabled}
                      value={draft[kind].intervalMinutes}
                      onChange={(event) => updateDraft(kind, { intervalMinutes: Number(event.target.value) })}
                      className="h-10 min-w-0 w-full rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                    />
                    <span className="text-xs text-muted">{t("coreHour.minutes")}</span>
                  </span>
                </label>
                <div>
                  <p className="text-xs text-muted">{t("pauseHydrate.completedToday")}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{state.completedToday[kind]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t("pauseHydrate.nextDue")}</p>
                  <p className={`mt-2 text-sm font-semibold ${pending ? "text-warning" : "text-foreground"}`}>{nextStatus(kind)}</p>
                </div>
              </div>

              {pending && (
                <Alert
                  variant={kind === "break" ? "warning" : "info"}
                  title={t(kind === "break" ? "pauseHydrate.pendingBreak" : "pauseHydrate.pendingHydration")}
                  className="mt-5"
                >
                  <p>{t("pauseHydrate.pendingHint")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" disabled={actingKind !== null} onClick={() => void handleAction(kind, "completed")}>{t("pauseHydrate.complete")}</Button>
                    <Button variant="secondary" size="sm" disabled={actingKind !== null} onClick={() => void handleAction(kind, "snoozed")}>{t("pauseHydrate.later")}</Button>
                    <Button variant="ghost" size="sm" disabled={actingKind !== null} onClick={() => void handleAction(kind, "muted")}>{t("pauseHydrate.muteToday")}</Button>
                  </div>
                </Alert>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-7">
        <Button isLoading={saving} disabled={loading} onClick={() => void handleSave()}>{t("pauseHydrate.saveSettings")}</Button>
        <span className="text-sm text-success" aria-live="polite">{saved ? t("pauseHydrate.saved") : ""}</span>
      </div>

      <section aria-labelledby="today-activity-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="today-activity-heading" className="text-base font-semibold text-foreground">{t("pauseHydrate.todayActivity")}</h2>
          <span className="text-sm tabular-nums text-muted">{state.todayEvents.length}</span>
        </div>
        {state.todayEvents.length === 0 ? (
          <p className="py-8 text-sm text-muted">{t("pauseHydrate.noActivity")}</p>
        ) : (
          <ul className="mt-3 max-h-96 divide-y divide-border overflow-y-auto border-t border-border pr-1">
            {state.todayEvents.map((event) => (
              <li key={event.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm">
                <time className="tabular-nums text-muted" dateTime={event.occurredAt}>{time.format(new Date(event.occurredAt))}</time>
                <span className="truncate font-medium text-foreground">{t(`pauseHydrate.${event.kind}`)}</span>
                <span className="text-right text-muted">{t(`pauseHydrate.action${event.action[0].toUpperCase()}${event.action.slice(1)}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
