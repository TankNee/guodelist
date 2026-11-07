import { useEffect, useRef } from "react";
import { useApp } from "@/store/useApp";
import { isTauri } from "@/lib/platform";
import type { Task } from "@/types";

const ALL_DAY_HOUR = 9; // all-day tasks nag at 09:00 local time
const CATCH_UP_MS = 10 * 60 * 1000; // ignore reminders older than 10 minutes
const TICK_MS = 30 * 1000;

async function webNotify(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/** Windows toast is silent unless a sound is explicitly requested. */
export function desktopNotification(title: string, body: string) {
  return { title, body, sound: "Default" };
}

/** Send one desktop notification, preferring the Tauri plugin in the app. */
export async function notify(title: string, body: string) {
  if (isTauri()) {
    try {
      const mod = await import("@tauri-apps/plugin-notification");
      let granted = await mod.isPermissionGranted();
      if (!granted) granted = (await mod.requestPermission()) === "granted";
      if (granted) {
        mod.sendNotification(desktopNotification(title, body));
        return;
      }
    } catch {
      // fall through to the web API
    }
  }
  await webNotify(title, body);
}

export function reminderAt(task: Task): number | null {
  if (!task.dueDate || task.done) return null;
  const time = task.dueTime ?? `${String(ALL_DAY_HOUR).padStart(2, "0")}:00`;
  const start = new Date(`${task.dueDate}T${time}:00`).getTime();
  if (Number.isNaN(start)) return null;
  const lead = task.reminderMinutes ?? null;
  if (lead === null) return null;
  return start - lead * 60 * 1000;
}

export function reminderKey(task: Task): string {
  return `${task.dueDate ?? ""}T${task.dueTime ?? "all-day"}|${task.reminderMinutes ?? "none"}`;
}

/**
 * Polls once every 30 seconds while the app is open and fires a notification
 * for any task whose reminder timestamp has just passed. `notifiedAt` keeps it
 * idempotent across restarts and across the widget window.
 */
export function useReminders() {
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const tick = async () => {
      const { tasks, settings, updateTask } = useApp.getState();
      if (!settings.notificationsEnabled) return;
      const now = Date.now();

      for (const task of tasks) {
        if (task.done) continue;
        const effective: Task = {
          ...task,
          reminderMinutes:
            task.reminderMinutes ?? (task.dueTime ? settings.defaultReminder : null),
        };
        const at = reminderAt(effective);
        if (at === null) continue;
        if (now < at || now - at > CATCH_UP_MS) continue;
        const key = reminderKey(effective);
        if (task.notifiedAt === key) continue;

        const when = task.dueTime ? ` · ${task.dueTime}` : "";
        const body =
          settings.language === "en"
            ? `Due ${task.dueDate}${when}`
            : `到期 ${task.dueDate}${when}`;
        await notify(task.title, body);
        updateTask(task.id, { notifiedAt: key });
      }
    };

    void tick();
    timer.current = window.setInterval(() => void tick(), TICK_MS);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
