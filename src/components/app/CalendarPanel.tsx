import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/store/useApp";
import { cn } from "@/lib/utils";
import { toKey, weekdayCn } from "@/lib/date";
import { layoutBlocks } from "@/lib/time";
import { eventColor } from "@/lib/colors";
import { useResolvedTheme } from "@/lib/theme";
import { useLang, useT } from "@/lib/i18n";
import type { Task } from "@/types";

const WEEK_START = { weekStartsOn: 1 as const };
const HOUR_PX = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type CalView = "month" | "week" | "day";

export function CalendarPanel() {
  const tasks = useApp((s) => s.tasks);
  const lists = useApp((s) => s.lists);
  const setView = useApp((s) => s.setView);
  const setDay = useApp((s) => s.setDay);
  const selectTask = useApp((s) => s.selectTask);
  const pack = useApp((s) => s.settings.themePack);

  const [mode, setMode] = useState<CalView>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(toKey(new Date()));
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const resolvedTheme = useResolvedTheme();
  const t = useT();
  const lang = useLang();
  const locale = lang === "zh" ? zhCN : enUS;

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate || t.archived) continue;
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    return map;
  }, [tasks]);

  const openDay = (d: Date) => {
    setDay(toKey(d));
    setView({ kind: "today" });
  };

  const weekStart = startOfWeek(cursor, WEEK_START);
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const gridStart = startOfWeek(startOfMonth(cursor), WEEK_START);
  const monthDays = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  const dayTasks = useMemo(
    () =>
      (byDate.get(selected) ?? [])
        .slice()
        .sort(
          (a, b) =>
            (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") || a.order - b.order
        ),
    [byDate, selected]
  );

  useEffect(() => {
    if (mode === "week" && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = 7 * HOUR_PX - 12;
    }
  }, [mode]);

  const shift = (delta: number) => {
    if (mode === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    } else if (mode === "week") {
      setCursor(addDays(cursor, delta * 7));
    } else {
      const next = addDays(cursor, delta);
      setCursor(next);
      setSelected(toKey(next));
    }
  };

  const title =
    mode === "month"
      ? format(cursor, lang === "zh" ? "yyyy 年 M 月" : "MMMM yyyy", { locale })
      : mode === "week"
        ? `${format(weekStart, lang === "zh" ? "M月d日" : "MMM d")} – ${format(addDays(weekStart, 6), lang === "zh" ? "M月d日" : "MMM d")}`
        : format(new Date(`${selected}T00:00:00`), lang === "zh" ? "M 月 d 日 EEEE" : "EEEE, MMM d", { locale });

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line/80 bg-panel panel-shadow">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="truncate text-[24px] leading-[1.15] font-bold tracking-[-0.035em] whitespace-nowrap text-ink">
            {title}
          </h1>
          <span className="hidden text-[12px] text-ink-3 xl:inline">
            {mode === "month" ? t("cal.monthView") : mode === "week" ? t("cal.weekView") : t("cal.dayView")}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="prev"
            onClick={() => shift(-1)}
            className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
          >
            <ChevronLeft size={15} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setCursor(new Date());
              setSelected(toKey(new Date()));
            }}
            className="h-8 rounded-full bg-panel-2 px-3 text-[12px] font-medium text-ink-2 transition hover:text-ink"
          >
            {t("cal.today")}
          </button>
          <button
            type="button"
            aria-label="next"
            onClick={() => shift(1)}
            className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
          >
            <ChevronRight size={15} strokeWidth={2.2} />
          </button>

          <div className="ml-1 relative flex items-center rounded-full bg-panel-2 p-[3px]">
            <span
              aria-hidden
              className="absolute top-[3px] bottom-[3px] left-[3px] w-10 rounded-full bg-panel shadow-[0_1px_2px_rgba(28,26,23,0.10)] transition-transform duration-200 ease-out"
              style={{
                transform: `translateX(${(mode === "month" ? 0 : mode === "week" ? 1 : 2) * 40}px)`,
              }}
            />
            {(
              [
                ["month", t("cal.month")],
                ["week", t("cal.week")],
                ["day", t("cal.day")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  if (value === "day") setSelected(toKey(cursor));
                }}
                className={cn(
                  "relative z-10 h-6 w-10 rounded-full text-[11.5px] font-medium transition-colors",
                  mode === value ? "text-ink" : "text-ink-3 hover:text-ink-2"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {mode === "month" && (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <div className="grid grid-cols-7 pb-1.5">
            {(lang === "zh" ? ["一", "二", "三", "四", "五", "六", "日"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map((d) => (
              <div key={d} className="px-2 text-[11px] font-medium tracking-[0.05em] text-ink-3">
                {lang === "zh" ? `周${d}` : d}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] gap-px overflow-hidden rounded-xl bg-line">
            {monthDays.map((d) => {
              const key = toKey(d);
              const items = byDate.get(key) ?? [];
              const open = items.filter((t) => !t.done);
              const muted = !isSameMonth(d, cursor);

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(key)}
                  onDoubleClick={() => openDay(d)}
                  className={cn(
                    "group flex min-h-0 cursor-pointer flex-col gap-1 bg-panel p-2 transition-colors",
                    muted ? "bg-panel-2/50" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "num grid size-6 place-items-center rounded-full text-[12px]",
                        isToday(d)
                          ? "bg-brand font-semibold text-white"
                          : muted
                            ? "text-ink-3/55"
                            : "text-ink-2"
                      )}
                    >
                      {format(d, "d")}
                    </span>
                    {open.length > 0 && (
                      <span className="num text-[10px] text-ink-3">{open.length}</span>
                    )}
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-hidden">
                    {open.slice(0, 3).map((t) => {
                      const color = eventColor(t.listId, resolvedTheme, pack);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectTask(t.id);
                          }}
                          style={{ backgroundColor: color.bg, color: color.text }}
                          className="truncate rounded-[4px] px-1 py-[1px] text-left text-[10.5px] transition hover:brightness-[0.97]"
                        >
                          {t.title}
                        </button>
                      );
                    })}
                    {open.length > 3 && (
                      <span className="px-1 text-[10px] text-ink-3">+{open.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "week" && (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <div className="min-w-0 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex items-end border-b border-line/70 pb-1">
                <div className="w-12 shrink-0" />
                {weekDays.map((d) => {
                  const key = toKey(d);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelected(key);
                        setCursor(d);
                        setMode("day");
                      }}
                      className="flex flex-1 flex-col items-center gap-0.5 rounded px-1 py-0.5 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                    >
                      <span className="text-[10.5px] text-ink-3">{lang === "zh" ? `周${weekdayCn(d)}` : format(d, "EEE")}</span>
                      <span
                        className={cn(
                          "num grid size-6 place-items-center rounded-full text-[13px] font-semibold",
                          isToday(d) ? "bg-brand text-white" : "text-ink"
                        )}
                      >
                        {format(d, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex border-b border-line/70 py-1">
                <div className="w-12 shrink-0 pr-1 text-right text-[10px] leading-5 text-ink-3">
                  {t("cal.allDay")}
                </div>
                {weekDays.map((d) => {
                  const key = toKey(d);
                  const items = (byDate.get(key) ?? []).filter((t) => !t.done && !t.dueTime);
                  return (
                    <div key={key} className="flex min-h-[20px] flex-1 flex-col gap-0.5 px-0.5">
                      {items.map((t) => {
                        const color = eventColor(t.listId, resolvedTheme, pack);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => selectTask(t.id)}
                            style={{ backgroundColor: color.bg, color: color.text }}
                            className="truncate rounded px-1 py-[1px] text-left text-[10px] hover:brightness-[0.97]"
                          >
                            {t.title}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div ref={weekScrollRef} className="mt-1 min-h-0 flex-1 overflow-auto">
            <div className="min-w-[720px]">
              <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
                <div className="w-12 shrink-0">
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: HOUR_PX }} className="relative">
                      <span className="num absolute -top-1.5 right-1.5 text-[9.5px] text-ink-3">
                        {String(h).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {weekDays.map((d) => {
                  const key = toKey(d);
                  const blocks = layoutBlocks((byDate.get(key) ?? []).filter((t) => !t.done));
                  return (
                    <div
                      key={key}
                      className={cn(
                        "relative flex-1 border-l border-line/50",
                        isToday(d) && "bg-brand/[0.035]"
                      )}
                    >
                      {HOURS.map((h) => (
                        <div key={h} style={{ height: HOUR_PX }} className="border-b border-line/40" />
                      ))}

                      {blocks.map((b) => {
                        const t = b.task;
                        const color = eventColor(t.listId, resolvedTheme, pack);
                        const top = (b.start / 60) * HOUR_PX;
                        const height = Math.max(22, ((b.end - b.start) / 60) * HOUR_PX - 2);
                        const widthPct = 100 / b.cols;
                        const compact = height < 34;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => selectTask(t.id)}
                            style={{
                              top,
                              height,
                              left: `calc(${b.col * widthPct}% + 1px)`,
                              width: `calc(${widthPct}% - 2px)`,
                              backgroundColor: color.bg,
                              color: color.text,
                              border: `1px solid color-mix(in srgb, ${color.text} 22%, transparent)`,
                            }}
                            className="absolute z-10 overflow-hidden rounded-[5px] px-1 py-[2px] text-left leading-[1.2] transition hover:brightness-[0.97]"
                          >
                            {compact ? (
                              <span className="flex items-center gap-1 overflow-hidden">
                                <span className="num shrink-0 text-[9px] opacity-75">{t.dueTime}</span>
                                <span className="truncate text-[9.5px] font-medium">{t.title}</span>
                              </span>
                            ) : (
                              <>
                                <span className="num block text-[9px] opacity-75">
                                  {t.dueTime}
                                  {t.endTime ? `–${t.endTime}` : ""}
                                </span>
                                <span className="block truncate text-[9.5px] font-medium">
                                  {t.title}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}

                      {isToday(d) && <NowLine />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "day" && (
        <div className="mx-auto flex min-h-0 w-full max-w-[860px] flex-1 flex-col px-5 pb-5">
          <p className="mb-2 text-[12px] text-ink-3">
            {t("cal.pending", { n: dayTasks.filter((x) => !x.done).length })} · {t("cal.doneCount", { n: dayTasks.filter((x) => x.done).length })}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {dayTasks.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-[13px] text-ink-2">{t("cal.emptyDay")}</p>
                <p className="text-[11.5px] text-ink-3">{lang === "zh" ? "双击月视图里的某一天可以回到列表添加" : "Double-click a day in the month view to add from the list"}</p>
              </div>
            )}
            {dayTasks.map((task) => {
              const color = eventColor(task.listId, resolvedTheme, pack);
              const list = lists.find((l) => l.id === task.listId);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => selectTask(task.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color.text }} />
                  <span className="num w-24 shrink-0 text-[11px] text-ink-3">
                    {task.dueTime ? `${task.dueTime}${task.endTime ? `–${task.endTime}` : ""}` : t("cal.allDay")}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[13.5px]",
                      task.done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink"
                    )}
                  >
                    {task.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-3">
                    {list?.emoji} {list?.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function NowLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-brand"
      style={{ top: (minutes / 60) * HOUR_PX }}
    >
      <span className="absolute -top-[4px] -left-[3px] size-[7px] rounded-full bg-brand" />
    </div>
  );
}
