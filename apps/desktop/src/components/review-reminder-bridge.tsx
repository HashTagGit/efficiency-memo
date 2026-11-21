import { useEffect, useRef } from "react";
import { getCurrentUser } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { readSystemInterruptionState } from "../lib/system-interruption";
import { acknowledgeReviewReminders, claimReviewReminders } from "../features/core-hour/review-reminder";
import { canDeliverDesktopReminder, deliverDesktopReminder } from "../lib/desktop-reminders";

export function ReviewReminderBridge() {
  const { t } = useI18n();
  const polling = useRef(false);
  const userId = getCurrentUser()?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    const tick = async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        if (!(await canDeliverDesktopReminder())) return;
        const interruption = await readSystemInterruptionState();
        const notificationsAllowed = interruption === null || interruption?.reason === "unsupported"
          ? null
          : interruption.notificationsAllowed;
        const kinds = await claimReviewReminders(userId, notificationsAllowed);
        if (disposed) return;
        for (const claim of kinds) {
          const delivered = await deliverDesktopReminder({
            kind: claim.kind === "daily" ? "daily-review" : "weekly-review",
            title: t(claim.kind === "daily" ? "reviewReminder.dailyTitle" : "reviewReminder.weeklyTitle"),
            body: t(claim.kind === "daily" ? "reviewReminder.dailyBody" : "reviewReminder.weeklyBody"),
          });
          if (delivered) await acknowledgeReviewReminders(userId, claim.acknowledgeKinds);
        }
      } catch (error) {
        console.warn("Review reminder polling failed.", error);
      } finally {
        polling.current = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => { void tick(); }, 60_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [t, userId]);

  return null;
}
