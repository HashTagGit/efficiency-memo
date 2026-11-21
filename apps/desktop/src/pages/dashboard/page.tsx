import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, EmptyState, PageHeader, PetIcon } from "@memo/ui";
import { getRegisteredTools } from "../../lib/tool-registry/registry";
import { useI18n } from "../../lib/i18n";
import { localizedToolCopy } from "../../lib/tool-registry/presentation";
import { getCurrentUser } from "../../lib/auth";
import { useSession } from "../../features/core-hour/hooks/use-session";
import { useCoreHourLoadState, useCoreHourTimer } from "../../features/core-hour/runtime";
import { usePauseHydrate } from "../../features/pause-hydrate/context";
import { effectiveReminderDueAt } from "../../features/pause-hydrate/reminder-logic";
import { loadDashboardNow, type DashboardNowData } from "./dashboard-data";

function ToolIcon({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "CoreHour": (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    "Pause & Hydrate": (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5S6.5 9.2 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.2 12 3.5 12 3.5Z" />
        <path d="M9.5 15.2a2.8 2.8 0 0 0 2.5 1.6" />
      </svg>
    ),
  };

  return iconMap[name] ?? (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function SummaryPanel({
  icon,
  title,
  value,
  description,
  tone,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  tone: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className={`flex min-h-48 flex-col border-l-2 bg-surface px-5 py-4 ${tone}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </div>
      <p className="mt-5 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-auto pt-5">
        <Button size="sm" variant="secondary" onClick={onAction}>{actionLabel}</Button>
      </div>
    </article>
  );
}

interface AttentionItem {
  id: string;
  owner: string;
  title: string;
  description: string;
  tone: string;
  actionLabel: string;
  route: string;
}

function AttentionFeed({
  items,
  onOpen,
  title,
  hint,
  statusLabel,
  statusTone,
  retryLabel,
  onRetry,
}: {
  items: AttentionItem[];
  onOpen: (route: string) => void;
  title: string;
  hint: string;
  statusLabel: string | null;
  statusTone: string;
  retryLabel: string;
  onRetry?: () => void;
}) {
  return (
    <section className="border-t border-border pt-6" aria-labelledby="dashboard-attention-heading">
      <h2 id="dashboard-attention-heading" className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.id} data-testid="dashboard-attention-item" className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className={`border-l-2 pl-3 ${item.tone}`}>
                <p className="text-xs font-semibold">{item.owner}</p>
                <h3 className="mt-1 text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onOpen(item.route)}>{item.actionLabel}</Button>
            </li>
          ))}
        </ul>
      )}
      {statusLabel && (
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 py-2 pl-3 ${statusTone}`}>
          <p className="text-sm text-muted" role="status">{statusLabel}</p>
          {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>{retryLabel}</Button>}
        </div>
      )}
    </section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const tools = getRegisteredTools().filter((tool) => tool.enabled);
  const userId = getCurrentUser()?.id ?? null;
  const { activeSession } = useSession();
  const timer = useCoreHourTimer();
  const { loading: coreLoading, loadError: coreLoadError, refresh: refreshCoreHour } = useCoreHourLoadState();
  const {
    state: pauseState,
    loading: pauseLoading,
    loadError: pauseLoadError,
    systemInterruption,
    refresh: refreshPauseHydrate,
  } = usePauseHydrate();
  const [nowData, setNowData] = useState<DashboardNowData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setDataLoading(true);
    setDataError(false);
    if (!userId) {
      setDataError(true);
      setDataLoading(false);
      return;
    }
    try {
      const next = await loadDashboardNow(userId);
      if (request !== requestRef.current) return;
      setNowData(next);
    } catch {
      if (request === requestRef.current) setDataError(true);
    } finally {
      if (request === requestRef.current) setDataLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]);

  const retryAttention = useCallback(async () => {
    await Promise.all([refreshCoreHour(), refreshPauseHydrate(), load()]);
  }, [load, refreshCoreHour, refreshPauseHydrate]);

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  const nextPlan = nowData?.nextPlan ?? null;
  const pendingReminders = (["break", "hydration"] as const).filter(
    (kind) => pauseState?.reminders[kind].pendingAt,
  );
  const pendingReminder = pendingReminders[0];
  const reminderNow = new Date();
  const effectiveReminderAt = (kind: "break" | "hydration") => {
    if (!pauseState) return null;
    const reminder = pauseState.reminders[kind];
    if (!pauseState.schedulePolicy) {
      return reminder.nextDueAt ? new Date(reminder.nextDueAt) : null;
    }
    const other = pauseState.reminders[kind === "break" ? "hydration" : "break"];
    const blocked = pauseState.schedulePolicy.systemDeferralEnabled
      && (pauseState.systemDeferred || systemInterruption?.notificationsAllowed === false);
    const blockedUntil = blocked
      ? pauseState.systemDeferralUntil && new Date(pauseState.systemDeferralUntil) > reminderNow
        ? new Date(pauseState.systemDeferralUntil)
        : reminderNow
      : null;
    return effectiveReminderDueAt(
      reminder,
      pauseState.schedulePolicy,
      reminderNow,
      other,
      blockedUntil,
    );
  };
  const nextReminderEntry = (["break", "hydration"] as const)
    .map((kind) => ({ kind, at: effectiveReminderAt(kind) }))
    .filter((entry): entry is { kind: "break" | "hydration"; at: Date } => Boolean(entry.at))
    .sort((left, right) => left.at.getTime() - right.at.getTime())[0];
  const nextReminder = nextReminderEntry?.kind;
  const nextReminderAt = nextReminderEntry?.at ?? null;
  const reminderWaitingForFocus = Boolean(
    pauseState?.coreHourActive && nextReminderAt && nextReminderAt <= reminderNow,
  );

  const focusValue = coreLoading
    ? t("dashboard.loading")
    : coreLoadError
      ? t("dashboard.unavailable")
      : activeSession
        ? formatElapsed(timer.elapsed)
        : t("dashboard.focusReady");
  const focusDescription = coreLoading
    ? t("dashboard.focusLoadingHint")
    : coreLoadError
      ? t("dashboard.focusUnavailableHint")
      : activeSession
        ? activeSession.activity || t("today.unnamed")
        : t("dashboard.noActiveFocus");
  const planValue = dataLoading && !nowData
    ? t("dashboard.loading")
    : dataError && !nowData
      ? t("dashboard.unavailable")
      : nextPlan?.title || t("dashboard.noPlan");
  const planDescription = !nowData && dataLoading
    ? t("dashboard.planLoadingHint")
    : !nowData && dataError
      ? t("dashboard.planUnavailableHint")
      : nextPlan
        ? t("dashboard.planTime", {
            start: timeFormatter.format(new Date(nextPlan.started_at)),
            end: timeFormatter.format(new Date(nextPlan.ended_at)),
          })
        : t("dashboard.noPlanHint");
  const reminderValue = pauseLoading
    ? t("dashboard.loading")
    : pauseLoadError && !pauseState
      ? t("dashboard.unavailable")
      : pendingReminder
        ? t("dashboard.dueNow")
        : reminderWaitingForFocus
          ? t("pauseHydrate.waitingForFocus")
          : nextReminderAt
            ? timeFormatter.format(nextReminderAt)
            : t("dashboard.remindersOff");
  const currentReminderDescription = pendingReminder
    ? t("dashboard.reminderDue", { name: t(`pauseHydrate.${pendingReminder}`) })
    : nextReminder
      ? t("dashboard.nextReminder", { name: t(`pauseHydrate.${nextReminder}`) })
      : t("dashboard.noReminderHint");
  const reminderDescription = pauseLoading
    ? t("dashboard.reminderLoadingHint")
    : pauseLoadError && !pauseState
      ? t("dashboard.reminderUnavailableHint")
      : pauseLoadError
        ? t("dashboard.reminderStale", { detail: currentReminderDescription })
        : currentReminderDescription;
  const attentionItems: AttentionItem[] = [];
  if (timer.uncertainInterval) {
    attentionItems.push({
      id: "uncertain-time",
      owner: t("nav.coreHour"),
      title: t("dashboard.attentionUncertainTitle"),
      description: t("dashboard.attentionUncertainDescription"),
      tone: "border-suggested text-suggested",
      actionLabel: t("dashboard.reviewTime"),
      route: "/tools/core-hour",
    });
  }
  if (nowData?.dueReviewKind) {
    const weekly = nowData.dueReviewKind === "weekly";
    attentionItems.push({
      id: "review",
      owner: t("nav.coreHour"),
      title: t(weekly ? "dashboard.attentionWeeklyReviewTitle" : "dashboard.attentionDailyReviewTitle"),
      description: t("dashboard.attentionReviewDescription"),
      tone: "border-focus text-focus",
      actionLabel: t(weekly ? "dashboard.openWeeklyReview" : "dashboard.openDailyReview"),
      route: weekly ? "/tools/core-hour/review/week" : "/tools/core-hour/review",
    });
  }
  if (pendingReminder) {
    const multiple = pendingReminders.length > 1;
    attentionItems.push({
      id: "reminder",
      owner: t("pauseHydrate.title"),
      title: multiple
        ? t("dashboard.attentionMultipleRemindersTitle")
        : t("dashboard.attentionReminderTitle", { name: t(`pauseHydrate.${pendingReminder}`) }),
      description: t("dashboard.attentionReminderDescription"),
      tone: multiple
        ? "border-warning text-warning"
        : pendingReminder === "hydration" ? "border-hydration text-hydration" : "border-recovery text-recovery",
      actionLabel: t("dashboard.openReminders"),
      route: "/tools/pause-hydrate",
    });
  }
  const pendingSuggestionCount = nowData?.pendingSuggestionCount ?? 0;
  if (pendingSuggestionCount > 0) {
    attentionItems.push({
      id: "activity-suggestions",
      owner: t("activityAssist.title"),
      title: t("dashboard.activitySuggestions"),
      description: t("dashboard.pendingSuggestionCount", { count: pendingSuggestionCount }),
      tone: "border-suggested text-suggested",
      actionLabel: t("dashboard.reviewSuggestions"),
      route: "/tools/core-hour/assist",
    });
  }
  const attentionLoading = coreLoading || pauseLoading || dataLoading;
  const attentionUnavailable = coreLoadError || pauseLoadError || dataError;
  const attentionStatusLabel = attentionLoading
    ? t("dashboard.attentionLoading")
    : attentionUnavailable
      ? t("dashboard.attentionUnavailable")
      : attentionItems.length === 0 ? t("dashboard.attentionClear") : null;
  const attentionStatusTone = attentionLoading
    ? "border-info"
    : attentionUnavailable ? "border-warning" : "border-success";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        action={<Button variant="secondary" onClick={() => navigate("/tools/core-hour/review")}>{t("dashboard.dayCloseout")}</Button>}
      />

      {nowData && dataLoading && (
        <p className="text-sm text-muted" role="status" aria-live="polite">{t("dashboard.updating")}</p>
      )}
      {dataError && (
        <Alert variant="error" title={t("dashboard.loadErrorTitle")}>
          <p>{t(nowData ? "dashboard.refreshErrorDescription" : "dashboard.loadErrorDescription")}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => void load()}>{t("coreHour.retry")}</Button>
        </Alert>
      )}

      <AttentionFeed
        items={attentionItems.slice(0, 5)}
        onOpen={navigate}
        title={t("dashboard.attentionTitle")}
        hint={t("dashboard.attentionHint")}
        statusLabel={attentionStatusLabel}
        statusTone={attentionStatusTone}
        retryLabel={t("dashboard.attentionRetry")}
        onRetry={attentionUnavailable && !attentionLoading ? () => { void retryAttention(); } : undefined}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-now-grid" aria-label={t("dashboard.nowSummary")}>
        <SummaryPanel
          icon={<ToolIcon name="CoreHour" />}
          title={t("dashboard.focus")}
          value={focusValue}
          description={focusDescription}
          tone="border-focus text-focus"
          actionLabel={t(activeSession ? "dashboard.openFocus" : "dashboard.startFocus")}
          onAction={() => navigate("/tools/core-hour")}
        />
        <SummaryPanel
          icon={<ToolIcon name="CoreHour" />}
          title={t("dashboard.nextPlan")}
          value={planValue}
          description={planDescription}
          tone="border-planned text-planned"
          actionLabel={t("dashboard.openTimeline")}
          onAction={() => navigate("/tools/core-hour/history")}
        />
        <SummaryPanel
          icon={<ToolIcon name="Pause & Hydrate" />}
          title={t("dashboard.reminders")}
          value={reminderValue}
          description={reminderDescription}
          tone="border-recovery text-recovery"
          actionLabel={t("dashboard.openReminders")}
          onAction={() => navigate("/tools/pause-hydrate")}
        />
      </section>

      <section className="border-t border-border pt-6" aria-labelledby="dashboard-tools-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dashboard-tools-heading" className="text-base font-semibold text-foreground">{t("dashboard.tools")}</h2>
            <p className="mt-1 text-sm text-muted">{t("dashboard.toolsHint")}</p>
          </div>
        </div>
      {tools.length === 0 ? (
        <EmptyState
          data-testid="dashboard-empty-state"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          }
          title={t("dashboard.noTools")}
          description={t("dashboard.noToolsDescription")}
        />
      ) : (
        <div
          data-testid="dashboard-tool-launcher"
          className="mt-4 flex flex-wrap gap-2"
        >
          {tools.map((tool) => {
            const copy = localizedToolCopy(tool, t);
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  const route = tool.routes[0];
                  if (route) navigate(route);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-control-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                data-testid={`dashboard-tool-card-${tool.id}`}
              >
                <span className="text-muted">{tool.icon === "paw" ? <PetIcon size={24} /> : <ToolIcon name={tool.name} />}</span>
                {copy.name}
              </button>
            );
          })}
        </div>
      )}
      </section>
    </div>
  );
}
