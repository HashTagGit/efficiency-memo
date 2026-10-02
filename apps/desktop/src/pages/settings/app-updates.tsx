import React, { useEffect, useRef, useState } from "react";
import { Button } from "@memo/ui";
import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useSession } from "../../features/core-hour/hooks/use-session";
import { useI18n } from "../../lib/i18n";

type Status = "idle" | "checking" | "current" | "available" | "downloading" | "ready" | "installing" | "error";

export function AppUpdates() {
  const { t } = useI18n();
  const { activeSession } = useSession();
  const [version, setVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [nextVersion, setNextVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const updateRef = useRef<Update | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const desktop = isTauri();

  useEffect(() => {
    mounted.current = true;
    if (desktop) void getVersion().then((value) => {
      if (mounted.current) setVersion(value);
    }).catch(() => { if (mounted.current) setError("updates.checkError"); });
    return () => {
      mounted.current = false;
      if (!busy.current) void updateRef.current?.close().catch(() => undefined);
    };
  }, [desktop]);

  async function checkForUpdate() {
    if (busy.current) return;
    busy.current = true;
    setStatus("checking");
    setError("");
    try {
      await updateRef.current?.close();
      updateRef.current = null;
      const update = await check({ timeout: 20_000 });
      if (!mounted.current) { await update?.close(); return; }
      updateRef.current = update;
      setNextVersion(update?.version ?? "");
      setNotes(update?.body ?? "");
      setStatus(update ? "available" : "current");
    } catch {
      if (mounted.current) { setError("updates.checkError"); setStatus("error"); }
    } finally { busy.current = false; }
  }

  async function download() {
    const update = updateRef.current;
    if (!update || busy.current) return;
    busy.current = true;
    setStatus("downloading");
    setProgress(null);
    setError("");
    let total = 0;
    let received = 0;
    try {
      await update.download((event) => {
        if (!mounted.current) return;
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") received += event.data.chunkLength;
        if (total > 0) setProgress(Math.min(100, Math.round(received * 100 / total)));
      }, { timeout: 120_000 });
      if (mounted.current) setStatus("ready");
    } catch {
      if (mounted.current) { setError("updates.downloadError"); setStatus("available"); }
    } finally {
      busy.current = false;
      if (!mounted.current) await update.close().catch(() => undefined);
    }
  }

  async function install() {
    const update = updateRef.current;
    if (!update || activeSession || busy.current) return;
    busy.current = true;
    setStatus("installing");
    setError("");
    try {
      await invoke("ensure_update_installable");
      await update.install({ restartAfterInstall: true });
      await relaunch();
    } catch (reason) {
      if (mounted.current) {
        setError(String(reason).includes("active-session") ? "updates.activeSession" : "updates.installError");
        setStatus("ready");
      }
    } finally {
      busy.current = false;
      if (!mounted.current) await update.close().catch(() => undefined);
    }
  }

  const working = status === "checking" || status === "downloading" || status === "installing";
  return (
    <section className="border-t border-border py-6" aria-labelledby="app-updates-heading">
      <h2 id="app-updates-heading" className="text-base font-semibold text-foreground">{t("updates.title")}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t("updates.hint")}</p>
      <p className="mt-3 text-sm text-foreground">{t("updates.version", { version: version ?? "—" })}</p>
      {!desktop ? <p className="mt-3 text-sm text-muted">{t("updates.desktopOnly")}</p> : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={working || status === "ready"} isLoading={status === "checking"} onClick={() => void checkForUpdate()}>
              {t("updates.check")}
            </Button>
            {status === "available" || status === "downloading" ? (
              <Button disabled={working} isLoading={status === "downloading"} onClick={() => void download()}>{t("updates.download")}</Button>
            ) : null}
            {status === "ready" || status === "installing" ? (
              <Button disabled={Boolean(activeSession) || working} isLoading={status === "installing"} onClick={() => void install()}>{t("updates.install")}</Button>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted" role="status" aria-live="polite">
            {status === "current" ? t("updates.current")
              : status === "available" ? t("updates.available", { version: nextVersion })
              : status === "downloading" ? t("updates.downloading", { progress: progress === null ? "" : `${progress}%` })
              : status === "ready" ? t("updates.ready")
              : status === "installing" ? t("updates.installing") : ""}
          </p>
          {status === "downloading" ? <progress className="mt-2 h-2 w-full accent-accent" max={100} value={progress ?? undefined} aria-label={t("updates.download")} /> : null}
          {error ? <p className="mt-2 text-sm text-danger" role="alert">{t(error)}</p> : null}
          {activeSession && (status === "ready" || status === "installing") ? <p className="mt-2 text-sm text-warning">{t("updates.activeSession")}</p> : null}
          {notes ? <details className="mt-3 text-sm text-foreground"><summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">{t("updates.notes")}</summary><p className="mt-2 whitespace-pre-wrap break-words text-muted">{notes}</p></details> : null}
        </>
      )}
    </section>
  );
}
