import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Alert, PageHeader } from "@memo/ui";
import {
  storeWebdavCredentials,
  syncExport,
  syncImport,
  syncList,
} from "../../../lib/sync";
import { useI18n } from "../../../lib/i18n";

const URL_KEY = "efficiency-memo-webdav-url";
const USERNAME_KEY = "efficiency-memo-webdav-username";
const LAST_SYNC_KEY = "efficiency-memo-last-sync";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncResult {
  message: string;
  type: "success" | "error" | "info";
}

export function SyncSettingsPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [credentialsSaved, setCredentialsSaved] = useState(false);

  // Load persisted values on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem(URL_KEY);
    const savedUsername = localStorage.getItem(USERNAME_KEY);
    const savedLastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (savedUrl) setUrl(savedUrl);
    if (savedUsername) setUsername(savedUsername);
    if (savedLastSync) setLastSync(savedLastSync);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  const validateInputs = useCallback((): string | null => {
    if (!url.trim()) return t("sync.urlRequired");
    if (!username.trim()) return t("sync.usernameRequired");
    return null;
  }, [url, username, t]);

  const handleSaveCredentials = useCallback(async () => {
    clearResult();
    const validationError = validateInputs();
    if (validationError) {
      setResult({ message: validationError, type: "error" });
      return;
    }

    setIsSavingCredentials(true);
    try {
      await storeWebdavCredentials(username.trim(), password);
      setCredentialsSaved(true);
      setResult({
        message: t("sync.credentialsSaved"),
        type: "success",
      });
      // Persist URL and username (but NOT password)
      localStorage.setItem(URL_KEY, url.trim());
      localStorage.setItem(USERNAME_KEY, username.trim());
      // Clear password from React state after saving
      setPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("sync.saveFailed");
      setResult({ message: msg, type: "error" });
    } finally {
      setIsSavingCredentials(false);
    }
  }, [clearResult, validateInputs, url, username, password, t]);

  const handleExport = useCallback(async () => {
    clearResult();
    const validationError = validateInputs();
    if (validationError) {
      setResult({ message: validationError, type: "error" });
      return;
    }

    setIsExporting(true);
    setSyncStatus("syncing");
    try {
      const message = await syncExport(url.trim(), username.trim());
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      setLastSync(now);
      setSyncStatus("success");
      setResult({ message, type: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("sync.exportFailed");
      setSyncStatus("error");
      setResult({ message: msg, type: "error" });
    } finally {
      setIsExporting(false);
    }
  }, [clearResult, validateInputs, url, username, t]);

  const handleImport = useCallback(async () => {
    clearResult();
    const validationError = validateInputs();
    if (validationError) {
      setResult({ message: validationError, type: "error" });
      return;
    }

    setIsImporting(true);
    setSyncStatus("syncing");
    try {
      const message = await syncImport(url.trim(), username.trim());
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      setLastSync(now);
      setSyncStatus("success");
      setResult({
        message: `${message} ${t("sync.importRestart")}`,
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("sync.importFailed");
      setSyncStatus("error");
      setResult({ message: msg, type: "error" });
    } finally {
      setIsImporting(false);
    }
  }, [clearResult, validateInputs, url, username, t]);

  const handleListBackups = useCallback(async () => {
    clearResult();
    const validationError = validateInputs();
    if (validationError) {
      setResult({ message: validationError, type: "error" });
      return;
    }

    setIsListing(true);
    try {
      const list = await syncList(url.trim(), username.trim());
      setBackups(list);
      if (list.length === 0) {
        setResult({ message: t("sync.noRemoteBackups"), type: "info" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("sync.listFailed");
      setResult({ message: msg, type: "error" });
    } finally {
      setIsListing(false);
    }
  }, [clearResult, validateInputs, url, username, t]);

  const statusDot = () => {
    switch (syncStatus) {
      case "syncing":
        return <span className="inline-block w-2 h-2 rounded-full bg-info animate-pulse" />;
      case "success":
        return <span className="inline-block w-2 h-2 rounded-full bg-success" />;
      case "error":
        return <span className="inline-block w-2 h-2 rounded-full bg-danger" />;
      default:
        return <span className="inline-block w-2 h-2 rounded-full bg-muted" />;
    }
  };

  const statusLabel = () => {
    switch (syncStatus) {
      case "syncing":
        return t("sync.syncing");
      case "success":
        return t("sync.success");
      case "error":
        return t("sync.error");
      default:
        return t("sync.idle");
    }
  };

  const formattedLastSync = lastSync
    ? new Date(lastSync).toLocaleString(locale)
    : t("sync.never");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={t("sync.title")}
        subtitle={t("sync.subtitle")}
        action={
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/dashboard")}>
            <span aria-hidden="true">&larr;</span>
            {t("sync.back")}
          </Button>
        }
      />

      {/* Result Alert */}
      {result && (
        <Alert
          variant={result.type}
          dismissible
          onDismiss={clearResult}
        >
          {result.message}
        </Alert>
      )}

      {/* WebDAV Configuration Card */}
      <section className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("sync.configuration")}</h2>
        <div className="space-y-4">
          <Input
            label={t("sync.serverUrl")}
            id="webdav-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://dav.example.com/"
          />

          <Input
            label={t("sync.username")}
            id="webdav-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
          />

          <div>
            <Input
            label={t("sync.password")}
              id="webdav-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("sync.passwordPlaceholder")}
            />
            <p className="mt-1 text-xs text-muted">
              {t("sync.passwordHint")}
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveCredentials}
              isLoading={isSavingCredentials}
              disabled={!url.trim() || !username.trim()}
            >
              {t("sync.saveCredentials")}
            </Button>
          </div>

          {credentialsSaved && (
            <p className="text-sm text-success flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t("sync.credentialsSaved")}
            </p>
          )}
        </div>
      </section>

      {/* Sync Actions Card */}
      <section className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{t("sync.actions")}</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleExport}
            isLoading={isExporting}
            disabled={!url.trim() || !username.trim()}
          >
            {t("sync.export")}
          </Button>
          <Button
            variant="secondary"
            onClick={handleImport}
            isLoading={isImporting}
            disabled={!url.trim() || !username.trim()}
          >
            {t("sync.import")}
          </Button>
        </div>
        {!credentialsSaved && (
          <p className="mt-3 text-sm text-warning">
            {t("sync.saveFirst")}
          </p>
        )}
      </section>

      {/* Sync History Card */}
      <section className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{t("sync.backups")}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleListBackups}
            isLoading={isListing}
            disabled={!url.trim() || !username.trim()}
          >
            {t("sync.refresh")}
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <svg
              className="mx-auto mb-3 text-muted"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm">{t("sync.noBackups")}</p>
            <p className="text-xs text-muted mt-1">{t("sync.refreshHint")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {backups.map((filename) => (
              <li
                key={filename}
                className="flex items-center gap-3 py-3 text-sm text-foreground"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted flex-shrink-0"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="font-mono text-xs">{filename}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Status / Last Synced */}
      <section className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {statusDot()}
              <span className="text-sm font-medium text-foreground">{statusLabel()}</span>
            </div>
          </div>
          <div className="text-sm text-muted">
            {t("sync.lastSynced")}: <span className="font-medium text-foreground">{formattedLastSync}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
