import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@memo/ui";
import {
  storeWebdavCredentials,
  syncExport,
  syncImport,
  syncList,
} from "../../../lib/sync";

const URL_KEY = "efficiency-memo-webdav-url";
const USERNAME_KEY = "efficiency-memo-webdav-username";
const LAST_SYNC_KEY = "efficiency-memo-last-sync";

type SyncStatus = "idle" | "syncing" | "success" | "error";

interface SyncResult {
  message: string;
  type: "success" | "error" | "info";
}

export function SyncSettingsPage() {
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
    if (!url.trim()) return "WebDAV Server URL is required.";
    if (!username.trim()) return "Username is required.";
    return null;
  }, [url, username]);

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
        message: "Credentials saved to system keychain.",
        type: "success",
      });
      // Persist URL and username (but NOT password)
      localStorage.setItem(URL_KEY, url.trim());
      localStorage.setItem(USERNAME_KEY, username.trim());
      // Clear password from React state after saving
      setPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save credentials.";
      setResult({ message: msg, type: "error" });
    } finally {
      setIsSavingCredentials(false);
    }
  }, [clearResult, validateInputs, url, username, password]);

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
      const msg = err instanceof Error ? err.message : "Export failed.";
      setSyncStatus("error");
      setResult({ message: msg, type: "error" });
    } finally {
      setIsExporting(false);
    }
  }, [clearResult, validateInputs, url, username]);

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
        message: `${message} Please restart the app to apply changes.`,
        type: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setSyncStatus("error");
      setResult({ message: msg, type: "error" });
    } finally {
      setIsImporting(false);
    }
  }, [clearResult, validateInputs, url, username]);

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
        setResult({ message: "No remote backups found.", type: "info" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to list backups.";
      setResult({ message: msg, type: "error" });
    } finally {
      setIsListing(false);
    }
  }, [clearResult, validateInputs, url, username]);

  const statusDot = () => {
    switch (syncStatus) {
      case "syncing":
        return <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
      case "success":
        return <span className="inline-block w-2 h-2 rounded-full bg-green-500" />;
      case "error":
        return <span className="inline-block w-2 h-2 rounded-full bg-red-500" />;
      default:
        return <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />;
    }
  };

  const statusLabel = () => {
    switch (syncStatus) {
      case "syncing":
        return "Syncing...";
      case "success":
        return "Success";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  };

  const formattedLastSync = lastSync
    ? new Date(lastSync).toLocaleString()
    : "Never";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sync Settings</h1>
        <p className="text-gray-500">Configure WebDAV cloud sync for your data</p>
      </div>

      {/* Result Alert */}
      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            result.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : result.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">
              {result.type === "success" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : result.type === "error" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </span>
            <span className="flex-1">{result.message}</span>
            <button
              onClick={clearResult}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* WebDAV Configuration Card */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">WebDAV Configuration</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="webdav-url" className="block text-sm font-medium text-gray-700 mb-1">
              WebDAV Server URL
            </label>
            <input
              id="webdav-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://dav.example.com/"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="webdav-username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="webdav-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="webdav-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="webdav-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your WebDAV password"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your password will be stored securely in the OS keychain, not in the browser.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveCredentials}
              isLoading={isSavingCredentials}
              disabled={!url.trim() || !username.trim()}
            >
              Save Credentials
            </Button>
          </div>

          {credentialsSaved && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Credentials saved to keychain
            </p>
          )}
        </div>
      </section>

      {/* Sync Actions Card */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleExport}
            isLoading={isExporting}
            disabled={!url.trim() || !username.trim()}
          >
            Export & Upload
          </Button>
          <Button
            variant="secondary"
            onClick={handleImport}
            isLoading={isImporting}
            disabled={!url.trim() || !username.trim()}
          >
            Download & Import
          </Button>
        </div>
        {!credentialsSaved && (
          <p className="mt-3 text-sm text-amber-600">
            Save your credentials first before running sync operations.
          </p>
        )}
      </section>

      {/* Sync History Card */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Remote Backups</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleListBackups}
            isLoading={isListing}
            disabled={!url.trim() || !username.trim()}
          >
            Refresh List
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="mx-auto mb-3 text-gray-300"
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
            <p className="text-sm">No backups found on the server.</p>
            <p className="text-xs text-gray-400 mt-1">Click Refresh List to fetch remote files.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {backups.map((filename) => (
              <li
                key={filename}
                className="flex items-center gap-3 py-3 text-sm text-gray-700"
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
                  className="text-gray-400 flex-shrink-0"
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
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {statusDot()}
              <span className="text-sm font-medium text-gray-700">{statusLabel()}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Last synced: <span className="font-medium text-gray-700">{formattedLastSync}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
