import React, { useEffect, useMemo, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Alert, Button, Input, Modal, PageHeader } from "@memo/ui";
import { useAppearance } from "../../lib/appearance";
import {
  createLocalBackup,
  currentDataSummary,
  prepareLocalRestore,
  previewLocalBackup,
  resetLocalData,
  type BackupPreview,
  type DataCounts,
  type ResetScope,
} from "../../lib/data-control";
import { getCurrentUser } from "../../lib/auth";
import { saveHumanExport, type HumanExportScope } from "../../lib/human-export";
import { useI18n } from "../../lib/i18n";
import { CORE_HOUR_SESSION_PROGRESS_KEY } from "../../lib/storage-keys";
import { DataSummary } from "./data-summary";
import { SettingsNavigation } from "./settings-navigation";

type BusyAction = "backup" | "preview" | "restore" | "export-core-hour"
  | "export-pause-hydrate" | "reset" | null;

interface RestoreCandidate {
  path: string;
  preview: BackupPreview;
}

const emptyCounts: DataCounts = {
  profiles: 0,
  coreHourSessions: 0,
  coreHourPlans: 0,
  coreHourTags: 0,
  pauseHydrateEvents: 0,
};

function backupFilename(): string {
  return "EfficiencyMemo-backup-" + new Date().toISOString().slice(0, 10) + ".ememo";
}

export function DataPrivacyPage() {
  const { locale, t } = useI18n();
  const { mode, palette } = useAppearance();
  const user = getCurrentUser();
  const [counts, setCounts] = useState<DataCounts>(emptyCounts);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<RestoreCandidate | null>(null);
  const [restoreScheduled, setRestoreScheduled] = useState(false);
  const [resetScope, setResetScope] = useState<ResetScope | null>(null);
  const [resetText, setResetText] = useState("");
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  useEffect(() => {
    void currentDataSummary()
      .then(setCounts)
      .catch((caught) => setError(messageForError(caught, t)));
  }, [t]);

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  async function handleBackup() {
    clearFeedback();
    const path = await save({
      defaultPath: backupFilename(),
      filters: [{ name: "EfficiencyMemo", extensions: ["ememo"] }],
    });
    if (!path) return;
    setBusy("backup");
    try {
      await createLocalBackup(path, { locale, themeMode: mode, palette });
      setNotice(t("dataPrivacy.backupCreated"));
    } catch (caught) {
      setError(messageForError(caught, t));
    } finally {
      setBusy(null);
    }
  }

  async function handleChooseRestore() {
    clearFeedback();
    setRestoreScheduled(false);
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "EfficiencyMemo", extensions: ["ememo"] }],
    });
    if (typeof selected !== "string") return;
    setBusy("preview");
    try {
      const preview = await previewLocalBackup(selected);
      setRestoreCandidate({ path: selected, preview });
    } catch (caught) {
      setRestoreCandidate(null);
      setError(messageForError(caught, t));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    if (!restoreCandidate) return;
    clearFeedback();
    setBusy("restore");
    try {
      await prepareLocalRestore(restoreCandidate.path);
      setRestoreScheduled(true);
      setNotice(t("dataPrivacy.restoreScheduled"));
    } catch (caught) {
      setError(messageForError(caught, t));
    } finally {
      setBusy(null);
    }
  }

  async function handleExport(scope: HumanExportScope) {
    clearFeedback();
    setBusy(scope === "core-hour" ? "export-core-hour" : "export-pause-hydrate");
    try {
      if (user && await saveHumanExport(scope, user.id)) {
        setNotice(t("dataPrivacy.exportCreated"));
      }
    } catch (caught) {
      setError(messageForError(caught, t));
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!resetScope || !user || (resetScope === "all" && resetText !== "RESET")) return;
    clearFeedback();
    setBusy("reset");
    try {
      await resetLocalData(resetScope, user.id);
      if (resetScope === "all") {
        window.localStorage.clear();
      } else if (resetScope === "core-hour") {
        window.localStorage.removeItem(CORE_HOUR_SESSION_PROGRESS_KEY);
      }
      window.location.reload();
    } catch (caught) {
      setError(messageForError(caught, t));
      setBusy(null);
    }
  }

  function openReset(scope: ResetScope) {
    clearFeedback();
    setResetText("");
    setResetScope(scope);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="data-privacy-page">
      <PageHeader title={t("dataPrivacy.title")} subtitle={t("dataPrivacy.subtitle")} />
      <SettingsNavigation />

      {(error || notice) && (
        <Alert variant={error ? "error" : "success"}>{error ?? notice}</Alert>
      )}

      <section className="border-t border-border py-6" aria-labelledby="local-data-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="local-data-heading" className="text-base font-semibold text-foreground">{t("dataPrivacy.localData")}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t("dataPrivacy.localDataHint")}</p>
          </div>
          <span className="rounded-md border border-privacy/40 bg-privacy/10 px-2.5 py-1 text-xs font-semibold text-privacy">
            {t("dataPrivacy.localOnly")}
          </span>
        </div>
        <div className="mt-5"><DataSummary counts={counts} /></div>
      </section>

      <section className="border-t border-border py-6" aria-labelledby="backup-heading">
        <h2 id="backup-heading" className="text-base font-semibold text-foreground">{t("dataPrivacy.backupRestore")}</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2 md:divide-x md:divide-border">
          <div className="md:pr-6">
            <h3 className="text-sm font-semibold text-foreground">{t("dataPrivacy.portableBackup")}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t("dataPrivacy.portableBackupHint")}</p>
            <p className="mt-3 border-l-2 border-privacy pl-3 text-xs leading-relaxed text-muted">{t("dataPrivacy.excludedSecrets")}</p>
            <Button className="mt-4" isLoading={busy === "backup"} disabled={busy !== null} onClick={() => void handleBackup()}>
              {t("dataPrivacy.createBackup")}
            </Button>
          </div>
          <div className="md:pl-6">
            <h3 className="text-sm font-semibold text-foreground">{t("dataPrivacy.restore")}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t("dataPrivacy.restoreHint")}</p>
            <Button className="mt-4" variant="secondary" isLoading={busy === "preview"} disabled={busy !== null} onClick={() => void handleChooseRestore()}>
              {t("dataPrivacy.chooseBackup")}
            </Button>
          </div>
        </div>

        {restoreCandidate && (
          <div className="mt-6 border-l-2 border-planned bg-planned/5 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("dataPrivacy.backupPreview")}</p>
                <p className="mt-1 text-xs text-muted">
                  {t("dataPrivacy.createdAt")}: {dateTime.format(new Date(restoreCandidate.preview.createdAt))}
                  {" · "}{t("dataPrivacy.schemaVersion")}: {restoreCandidate.preview.schemaVersion}
                  {" · "}{t("dataPrivacy.packageVersion")}: {restoreCandidate.preview.packageVersion}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t("dataPrivacy.preferences")}: {preferenceLabels(restoreCandidate.preview, t).join(" / ")}
                </p>
              </div>
              <Button
                size="sm"
                isLoading={busy === "restore"}
                disabled={busy !== null || restoreScheduled}
                onClick={() => void handleRestore()}
              >
                {t("dataPrivacy.scheduleRestore")}
              </Button>
            </div>
            <div className="mt-3"><DataSummary counts={restoreCandidate.preview.counts} /></div>
          </div>
        )}
      </section>

      <section className="border-t border-border py-6" aria-labelledby="exports-heading">
        <h2 id="exports-heading" className="text-base font-semibold text-foreground">{t("dataPrivacy.humanExports")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t("dataPrivacy.humanExportsHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" isLoading={busy === "export-core-hour"} disabled={busy !== null} onClick={() => void handleExport("core-hour")}>
            {t("dataPrivacy.exportCoreHour")}
          </Button>
          <Button variant="secondary" isLoading={busy === "export-pause-hydrate"} disabled={busy !== null} onClick={() => void handleExport("pause-hydrate")}>
            {t("dataPrivacy.exportPauseHydrate")}
          </Button>
        </div>
      </section>

      <section className="border-t border-danger/40 py-6" aria-labelledby="reset-heading">
        <h2 id="reset-heading" className="text-base font-semibold text-danger">{t("dataPrivacy.reset")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t("dataPrivacy.resetHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy !== null} onClick={() => openReset("core-hour")}>{t("dataPrivacy.resetCoreHour")}</Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => openReset("pause-hydrate")}>{t("dataPrivacy.resetPauseHydrate")}</Button>
          <Button variant="danger" disabled={busy !== null} onClick={() => openReset("all")}>{t("dataPrivacy.resetAll")}</Button>
        </div>
      </section>

      <Modal
        isOpen={resetScope !== null}
        onClose={() => { if (busy !== "reset") setResetScope(null); }}
        title={t("dataPrivacy.confirmResetTitle")}
        closeLabel={t("coreHour.cancel")}
      >
        <p className="text-sm leading-relaxed text-muted">
          {t("dataPrivacy.confirmReset" + resetKeySuffix(resetScope))}
        </p>
        {resetScope === "all" && (
          <Input
            className="mt-4"
            label={t("dataPrivacy.typeReset")}
            value={resetText}
            onChange={(event) => setResetText(event.target.value)}
            autoFocus
          />
        )}
        <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-border pt-4">
          <Button variant="secondary" disabled={busy !== null} onClick={() => { setResetScope(null); void handleBackup(); }}>
            {t("dataPrivacy.backupFirst")}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={busy !== null} onClick={() => setResetScope(null)}>{t("coreHour.cancel")}</Button>
            <Button
              variant="danger"
              isLoading={busy === "reset"}
              disabled={busy !== null || (resetScope === "all" && resetText !== "RESET")}
              onClick={() => void handleReset()}
            >
              {t("dataPrivacy.confirmResetAction")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function resetKeySuffix(scope: ResetScope | null): string {
  if (scope === "core-hour") return "CoreHour";
  if (scope === "pause-hydrate") return "PauseHydrate";
  return "All";
}

function preferenceLabels(
  preview: BackupPreview,
  t: (key: string) => string,
): string[] {
  const preferences = preview.preferences;
  const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);
  return [
    t(preferences.locale === "zh-CN" ? "nav.currentChinese" : "nav.currentEnglish"),
    t("appSettings.mode" + titleCase(preferences.themeMode)),
    t("appSettings.palette" + titleCase(preferences.palette)),
  ];
}

function messageForError(error: unknown, t: (key: string) => string): string {
  const message = String(error);
  if (message.includes("active-session")) return t("dataPrivacy.errorActiveSession");
  if (message.includes("future-schema")) return t("dataPrivacy.errorFutureSchema");
  if (message.includes("unsupported-package")) return t("dataPrivacy.errorUnsupportedPackage");
  if (message.includes("invalid-backup")) return t("dataPrivacy.errorInvalidBackup");
  if (message.includes("invalid-preferences")) return t("dataPrivacy.errorInvalidPreferences");
  return t("dataPrivacy.errorOperation");
}
