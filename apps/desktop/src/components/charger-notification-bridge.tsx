import { useEffect, useRef } from "react";
import { getCurrentUser } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { readSystemInterruptionState } from "../lib/system-interruption";
import {
  acknowledgeChargerNotification,
  claimDueChargerNotifications,
} from "../features/charger-reminder/charger-notifications";
import {
  chargerNotificationsGranted,
  notifyCharger,
} from "../features/charger-reminder/notifications";

export function ChargerNotificationBridge() {
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
        if (!(await chargerNotificationsGranted())) return;
        const interruption = await readSystemInterruptionState();
        if (interruption?.reason !== "unsupported" && interruption?.notificationsAllowed === false) return;
        const claims = await claimDueChargerNotifications(userId);
        if (disposed) return;
        for (const claim of claims) {
          const delivered = await notifyCharger(
            t("chargerNotification.title", { name: claim.name }),
            t("chargerNotification.body"),
          );
          if (delivered) await acknowledgeChargerNotification(claim.deviceId, claim.dueAt);
        }
      } catch (error) {
        console.warn("Charger Reminder polling failed.", error);
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
