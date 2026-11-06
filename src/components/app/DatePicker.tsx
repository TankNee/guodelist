import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEK_START = { weekStartsOn: 1 as const };

/**
 * Themed month picker. Replaces `<input type="date">`, whose native popup
 * cannot be styled and looks foreign next to the app.
 */
export function DatePicker({
  value,
  onChange,
  onClear,
  className,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  onClear?: () => void;
  className?: string;
}) {
  const [cursor, setCursor] = useState<Date>(() =>
    value ? parseISO(value) : new Date()
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), WEEK_START);
    return eachDayOfInterval({ start, end: addDays(start, 41) });
  }, [cursor]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          aria-label="上个月"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="grid size-6 place-items-center rounded-md text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[12px] font-medium text-ink-2">
          {format(cursor, "yyyy 年 M 月", { locale: zhCN })}
        </span>
        <button
          type="button"
          aria-label="下个月"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="grid size-6 place-items-center rounded-md text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <span key={d} className="grid h-6 place-items-center text-[10px] text-ink-3">
            {d}
          </span>
        ))}
        {days.map((d) => {
          const key = toKey(d);
          const selected = value === key;
          const muted = !isSameMonth(d, cursor);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "num grid h-7 place-items-center rounded-md text-[11.5px] transition",
                selected
                  ? "bg-brand font-semibold text-white"
                  : isToday(d)
                    ? "bg-brand/12 font-semibold text-brand-ink"
                    : muted
                      ? "text-ink-3/55 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                      : "text-ink-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
              )}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setCursor(now);
            onChange(toKey(now));
          }}
          className="h-6 rounded-md px-1.5 text-[11px] text-ink-3 transition hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
        >
          今天
        </button>
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="h-6 rounded-md px-1.5 text-[11px] text-ink-3 transition hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/10"
          >
            清除
          </button>
        )}
      </div>
    </div>
  );
}
