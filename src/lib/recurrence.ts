import { addDays, addMonths, isWeekend, startOfDay } from "date-fns";
import type { Recurrence, Task } from "@/types";
import { WEEKDAY_LABELS } from "@/types";
import { parseKey, toKey } from "@/lib/date";

/** Next occurrence for a repeating task, always strictly in the future. */
export function nextDueDate(task: Task): string | null {
  const r = task.recurrence;
  if (!r) return null;
  const base = task.dueDate ? parseKey(task.dueDate) : startOfDay(new Date());
  const step = Math.max(1, r.interval || 1);

  switch (r.freq) {
    case "daily":
      return toKey(addDays(base, step));

    case "weekdays": {
      let d = addDays(base, 1);
      while (isWeekend(d)) d = addDays(d, 1);
      return toKey(d);
    }

    case "weekly": {
      const days = r.weekdays?.length ? r.weekdays : [base.getDay()];
      const horizon = 7 * step + 1;
      for (let i = 1; i <= horizon; i++) {
        const d = addDays(base, i);
        if (days.includes(d.getDay())) return toKey(d);
      }
      return toKey(addDays(base, 7));
    }

    case "monthly":
      return toKey(addMonths(base, step));
  }
}

export function describeRecurrence(r: Recurrence | null): string {
  if (!r) return "重复";
  if (r.freq === "daily") return r.interval > 1 ? `每 ${r.interval} 天` : "每天";
  if (r.freq === "weekdays") return "每个工作日";
  if (r.freq === "monthly") return r.interval > 1 ? `每 ${r.interval} 个月` : "每月";
  const days = r.weekdays?.length
    ? [...r.weekdays].sort().map((d) => WEEKDAY_LABELS[d]).join("、")
    : "";
  if (days) return `每周${days}`;
  return r.interval > 1 ? `每 ${r.interval} 周` : "每周";
}
