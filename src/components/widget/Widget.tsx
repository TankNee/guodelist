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
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  LockOpen,
  Maximize2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/store/useApp";
import { useTheme, useResolvedTheme } from "@/lib/theme";
import { useCrossWindowSync } from "@/lib/sync";
import { hideWidget, openMainWindow, setWidgetSize } from "@/lib/widget";
import { parseInput, toKey, todayKey, weekdayCn } from "@/lib/date";
import { layoutBlocks, formatRange } from "@/lib/time";
import { eventColor } from "@/lib/colors";
import { useLang, useT } from "@/lib/i18n";
import { sortTasks } from "@/lib/select";
import { cn } from "@/lib/utils";
import { isTauri } from "@/lib/platform";
import type { Task, WidgetSize } from "@/types";
import { PRIORITIES } from "@/types";
import { TaskCheck } from "@/components/app/TaskCheck";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WidgetTaskDialog } from "./WidgetTaskDialog";
import { StarBuddy } from "@/components/brand/StarBuddy";

const WEEK_START = { weekStartsOn: 1 as const };
const HOUR_PX = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

type BoardView = "month" | "week" | "day";

const SIZES: { value: WidgetSize; label: string }[] = [
  { value: "compact", label: "widget.sizeCompact" },
  { value: "standard", label: "widget.sizeStandard" },
  { value: "fill", label: "widget.sizeFill" },
];

function TaskLine({
  task,
  locked,
  onOpen,
  onToggle,
  onDelete,
  showList = true,
}: {
  task: Task;
  locked: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
  showList?: boolean;
}) {
  const lists = useApp((s) => s.lists);
  const list = lists.find((l) => l.id === task.listId);
  const priority = PRIORITIES.find((p) => p.value === task.priority);

  return (
    <div className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
      <div className="pt-[2px]">
        <TaskCheck checked={task.done} onChange={onToggle} size={16} disabled={locked} />
      </div>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block truncate text-[13px] leading-snug",
            task.done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink"
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-3">
          {showList && list && (
            <span className="truncate">
              {list.emoji} {list.name}
            </span>
          )}
          {task.dueTime && <span className="num">· {task.dueTime}</span>}
          {task.priority !== "none" && priority && (
            <span style={{ color: priority.color }}>· {priority.label}</span>
          )}
          {task.subtasks.length > 0 && (
            <span className="num">
              · {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
            </span>
          )}
        </span>
      </button>
      {!locked && (
        <button
          type="button"
          aria-label="删除"
          onClick={onDelete}
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded text-ink-3 opacity-0 transition hover:bg-black/5 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 size={11.5} />
        </button>
      )}
    </div>
  );
}

export function Widget() {
  useTheme();
  useCrossWindowSync();
  const resolvedTheme = useResolvedTheme();

  const tasks = useApp((s) => s.tasks);
  const lists = useApp((s) => s.lists);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const toggleTask = useApp((s) => s.toggleTask);
  const addTask = useApp((s) => s.addTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const selectTask = useApp((s) => s.selectTask);

  const [view, setView] = useState<BoardView>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayKey());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const weekScrollRef = useRef<HTMLDivElement>(null);

  const locked = settings.widgetLocked;
  const size = settings.widgetSize;
  const pack = settings.themePack;
  const t = useT();
  const lang = useLang();
  const locale = lang === "zh" ? zhCN : enUS;

  useEffect(() => {
    document.documentElement.classList.add("widget-window");
    if (isTauri()) void setWidgetSize(settings.widgetSize);
    return () => document.documentElement.classList.remove("widget-window");
    // Only on mount: later changes go through the menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      const [{ getCurrentWindow }, { invoke }] = await Promise.all([
        import("@tauri-apps/api/window"),
        import("@tauri-apps/api/core"),
      ]);
      unlisten = await getCurrentWindow().onFocusChanged(({ payload }) => {
        if (payload) void invoke("widget_sink");
      });
    })();
    return () => unlisten?.();
  }, []);

  const today = todayKey();

  useEffect(() => {
    if (view === "week" && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = 7 * HOUR_PX - 14;
    }
  }, [view]);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate || t.archived) continue;
      const arr = map.get(t.dueDate) ?? [];
      arr.push(t);
      map.set(t.dueDate, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) => (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99") || a.order - b.order
      );
    }
    return map;
  }, [tasks]);

  const dayTasks = useMemo(
    () => sortTasks(tasks.filter((t) => t.dueDate === selected)),
    [tasks, selected]
  );
  const dayOpen = dayTasks.filter((t) => !t.done);

  const weekStart = startOfWeek(cursor, WEEK_START);
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const gridStart = startOfWeek(startOfMonth(cursor), WEEK_START);
  const monthDays = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  const openDetail = (id: string) => {
    selectTask(id);
    setDetailId(id);
  };

  const close = () => {
    setSettings({ widgetEnabled: false });
    void hideWidget();
  };

  const shift = (delta: number) => {
    if (view === "month") {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    } else if (view === "week") {
      setCursor(addDays(cursor, delta * 7));
    } else {
      const next = addDays(cursor, delta);
      setCursor(next);
      setSelected(toKey(next));
    }
  };

  const goToday = () => {
    setCursor(new Date());
    setSelected(today);
  };

  const chooseSize = (next: WidgetSize) => {
    setSettings({ widgetSize: next });
    if (isTauri()) void setWidgetSize(next);
  };

  const submit = (day: string) => {
    if (!draft.trim()) return;
    const parsed = parseInput(draft);
    addTask({
      title: parsed.title,
      listId: "inbox",
      dueDate: parsed.dueDate ?? day,
      dueTime: parsed.dueTime,
    });
    setDraft("");
  };

  const title =
    view === "month"
      ? format(cursor, lang === "zh" ? "yyyy 年 M 月" : "MMMM yyyy", { locale })
      : view === "week"
        ? `${format(weekStart, lang === "zh" ? "M月d日" : "MMM d")} – ${format(addDays(weekStart, 6), lang === "zh" ? "M月d日" : "MMM d")}`
        : format(new Date(`${selected}T00:00:00`), lang === "zh" ? "M 月 d 日 EEEE" : "EEEE, MMM d", { locale });

  const todayDone = tasks.filter((t) => t.done && t.completedAt?.slice(0, 10) === today).length;

  const addBar = (day: string) => (
    <div className="flex items-center gap-1.5 rounded-lg bg-panel-2 px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-line-strong">
      <Plus size={12} className="shrink-0 text-ink-3" />
      <input
        ref={inputRef}
        disabled={locked}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit(day);
        }}
        placeholder={
          locked ? "已锁定，解锁后可添加" : `给 ${format(new Date(`${day}T00:00:00`), "M月d日")} 加一件事`
        }
        className="w-full bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3 disabled:cursor-not-allowed"
      />
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div
        className="relative flex h-full flex-col overflow-hidden"
        style={{
          backgroundColor:
            resolvedTheme === "dark"
              ? pack === "starry"
                ? `rgba(37, 29, 46, ${settings.widgetOpacity})`
                : `rgba(11, 11, 13, ${settings.widgetOpacity})`
              : pack === "starry"
                ? `rgba(255, 246, 232, ${settings.widgetOpacity})`
                : `rgba(255, 254, 252, ${settings.widgetOpacity})`,
        }}
      >
        {pack === "starry" && (
          <div
            className="starry-backdrop pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          >
            <StarBuddy size={34} className="absolute right-6 bottom-10 text-[#9FD3F5] opacity-70" />
            <StarBuddy size={18} className="absolute right-24 bottom-4 text-[#F6C453] opacity-60" />
          </div>
        )}

        <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header
          data-tauri-drag-region
          className="drag-region flex shrink-0 items-center justify-between gap-4 px-5 pt-3.5 pb-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="flex w-[292px] shrink-0 items-center gap-1.5 text-[26px] leading-none font-bold tracking-[-0.03em] text-ink">
              {pack === "starry" && <StarBuddy size={24} className="shrink-0 text-[#F6C453]" />}
              <span className="truncate">{title}</span>
            </h1>
            <div className="relative flex shrink-0 items-center rounded-full bg-panel-2 p-[3px]">
              <span
                aria-hidden
                className="absolute top-[3px] bottom-[3px] left-[3px] w-10 rounded-full bg-panel shadow-[0_1px_2px_rgba(28,26,23,0.10)] transition-transform duration-200 ease-out"
                style={{
                  transform: `translateX(${(view === "month" ? 0 : view === "week" ? 1 : 2) * 40}px)`,
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
                    setView(value);
                    if (value === "day") setSelected(toKey(cursor));
                  }}
                  className={cn(
                    "relative z-10 h-6 w-10 rounded-full text-[11.5px] font-medium transition-colors duration-150",
                    view === value ? "text-ink" : "text-ink-3 hover:text-ink-2"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="hidden text-[11.5px] text-ink-3 xl:inline">
              今天完成 {todayDone} 项
            </span>
          </div>

          <div className="no-drag flex items-center gap-1">
            <button
              type="button"
              aria-label="上一页"
              onClick={() => shift(-1)}
              className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-8 rounded-full bg-panel-2 px-3 text-[12px] font-medium text-ink-2 transition hover:text-ink"
            >{t("cal.today")}</button>
            <button
              type="button"
              aria-label="下一页"
              onClick={() => shift(1)}
              className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
            >
              <ChevronRight size={15} />
            </button>

            <span className="mx-1 h-4 w-px bg-line" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="调整大小"
                  title="调整大小"
                  className="grid size-8 place-items-center rounded-full text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
                >
                  <Maximize2 size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel className="text-[11px] font-medium text-ink-3">
                  画板尺寸
                </DropdownMenuLabel>
                {SIZES.map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={() => chooseSize(s.value)}
                    className="text-[13px]"
                  >
                    {s.label}
                    {size === s.value && <Check size={13} className="ml-auto text-ink-3" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              aria-label={locked ? t("widget.unlock") : t("widget.lock")}
              title={locked ? t("widget.unlock") : t("widget.lock")}
              onClick={() => setSettings({ widgetLocked: !locked })}
              className={cn(
                "grid size-8 place-items-center rounded-full transition",
                locked
                  ? "bg-brand/10 text-brand-ink"
                  : "text-ink-3 hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
              )}
            >
              {locked ? <Lock size={14} /> : <LockOpen size={14} />}
            </button>

            <button
              type="button"
              aria-label={t("widget.openMain")}
              title={t("widget.openMain")}
              onClick={() => void openMainWindow()}
              className="grid size-8 place-items-center rounded-full text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
            >
              <ExternalLink size={14} />
            </button>

            <button
              type="button"
              aria-label={t("widget.close")}
              onClick={close}
              className="grid size-8 place-items-center rounded-full text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
            >
              <X size={15} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col px-5 pb-4">
            {view === "month" && (
              <>
                <div className="grid grid-cols-7 pb-1.5">
                  {(lang === "zh" ? ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).map((d) => (
                    <div key={d} className="px-2 text-[11px] font-medium tracking-[0.05em] text-ink-3">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[repeat(6,minmax(0,1fr))] gap-px overflow-hidden bg-line/60">
                  {monthDays.map((d) => {
                    const key = toKey(d);
                    const items = byDate.get(key) ?? [];
                    const open = items.filter((t) => !t.done);
                    const muted = !isSameMonth(d, cursor);
                    const isSelected = key === selected;

                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelected(key);
                          }
                        }}
                        className={cn(
                          "group flex min-h-0 flex-col items-stretch gap-1 p-2 text-left transition-colors",
                          isSelected
                            ? "bg-brand/[0.12]"
                            : muted
                              ? "bg-black/[0.03] hover:bg-black/[0.05] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                              : "bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "num grid size-6 place-items-center rounded-full text-[12.5px]",
                              isToday(d)
                                ? "bg-brand font-semibold text-white"
                                : muted
                                  ? "text-ink-3/55"
                                  : "text-ink-2"
                            )}
                          >
                            {format(d, "d")}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="num text-[10.5px] text-ink-3 group-hover:hidden">
                              {open.length > 0 ? open.length : ""}
                            </span>
                            {!locked && (
                              <button
                                type="button"
                                aria-label={`在 ${format(d, "M月d日")} 添加任务`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(key);
                                  requestAnimationFrame(() => inputRef.current?.focus());
                                }}
                                className="hidden size-5 place-items-center rounded text-ink-3 transition hover:bg-black/[0.06] hover:text-ink group-hover:grid dark:hover:bg-white/10"
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </span>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-hidden">
                          {open.slice(0, 4).map((t) => {
                            const color = eventColor(t.listId, resolvedTheme, pack);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(t.id);
                                }}
                                style={{ backgroundColor: color.bg, color: color.text }}
                                className="flex items-center gap-1 truncate rounded-[4px] px-1 py-[1px] text-left text-[10.5px] leading-[1.35] transition hover:brightness-[0.97]"
                              >
                                <span className="truncate">{t.title}</span>
                              </button>
                            );
                          })}
                          {open.length > 4 && (
                            <span className="px-1 text-[10.5px] text-ink-3">+{open.length - 4}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {view === "week" && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-end border-b border-line/70 pb-1">
                  <div className="w-14 shrink-0" />
                  {weekDays.map((d) => {
                    const key = toKey(d);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelected(key);
                          setCursor(d);
                          setView("day");
                        }}
                        className="flex flex-1 flex-col items-center gap-0.5 rounded px-1 py-0.5 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                      >
                        <span className="text-[10.5px] text-ink-3">周{weekdayCn(d)}</span>
                        <span
                          className={cn(
                            "num grid size-6 place-items-center rounded-full text-[13.5px] font-semibold",
                            isToday(d) ? "bg-brand text-white" : "text-ink"
                          )}
                        >
                          {format(d, "d")}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex max-h-[96px] overflow-y-auto border-b border-line/70 py-1">
                  <div className="w-14 shrink-0 pr-2 text-right text-[10px] leading-5 text-ink-3">{t("cal.allDay")}</div>
                  {weekDays.map((d) => {
                    const key = toKey(d);
                    const items = (byDate.get(key) ?? []).filter((t) => !t.done && !t.dueTime);
                    return (
                      <div key={key} className="flex min-h-[22px] flex-1 flex-col gap-0.5 px-0.5">
                        {items.map((t) => {
                          const color = eventColor(t.listId, resolvedTheme, pack);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => openDetail(t.id)}
                              style={{ backgroundColor: color.bg, color: color.text }}
                              className="truncate rounded px-1 py-[1px] text-left text-[10.5px] transition hover:brightness-[1.05]"
                            >
                              {t.title}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <div ref={weekScrollRef} className="min-h-0 flex-1 overflow-y-auto">
                  <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
                    <div className="w-14 shrink-0">
                      {HOURS.map((h) => (
                        <div key={h} style={{ height: HOUR_PX }} className="relative">
                          <span className="num absolute -top-1.5 right-2 text-[10px] text-ink-3">
                            {String(h).padStart(2, "0")}:00
                          </span>
                        </div>
                      ))}
                    </div>

                    {weekDays.map((d) => {
                      const key = toKey(d);
                      const blocks = layoutBlocks(
                        (byDate.get(key) ?? []).filter((t) => !t.done)
                      );
                      return (
                        <div
                          key={key}
                          onDoubleClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const hour = Math.floor((e.clientY - rect.top) / HOUR_PX);
                            setSelected(key);
                            setCursor(d);
                            setDraft(`${String(Math.min(23, Math.max(0, hour))).padStart(2, "0")}:00 `);
                            requestAnimationFrame(() => inputRef.current?.focus());
                          }}
                          className={cn(
                            "relative flex-1 border-l border-line/50",
                            isToday(d) && "bg-brand/[0.035]"
                          )}
                        >
                          {HOURS.map((h) => (
                            <div key={h} style={{ height: HOUR_PX }} className="border-b border-line/40" />
                          ))}

                          {blocks.map((block) => {
                            const t = block.task;
                            const color = eventColor(t.listId, resolvedTheme, pack);
                            const top = (block.start / 60) * HOUR_PX;
                            const height = Math.max(24, ((block.end - block.start) / 60) * HOUR_PX - 2);
                            const widthPct = 100 / block.cols;
                            const compact = height < 38;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => openDetail(t.id)}
                                style={{
                                  top,
                                  height,
                                  left: `calc(${block.col * widthPct}% + 2px)`,
                                  width: `calc(${widthPct}% - 4px)`,
                                  backgroundColor: color.bg,
                                  color: color.text,
                                  border: `1px solid color-mix(in srgb, ${color.text} 22%, transparent)`,
                                }}
                                className="absolute z-10 overflow-hidden rounded-[6px] px-1.5 py-[3px] text-left leading-[1.2] transition hover:brightness-[0.97]"
                              >
                                {compact ? (
                                  <span className="flex items-center gap-1 overflow-hidden">
                                    <span className="num shrink-0 text-[9.5px] opacity-75">
                                      {t.dueTime}
                                    </span>
                                    <span className="truncate text-[10.5px] font-medium">
                                      {t.title}
                                    </span>
                                  </span>
                                ) : (
                                  <>
                                    <span className="num block text-[9.5px] opacity-75">
                                      {t.dueTime}
                                      {t.endTime ? `–${t.endTime}` : ""}
                                    </span>
                                    <span className="mt-[1px] block truncate text-[10.5px] font-medium">
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

                <div className="pt-2">{addBar(selected)}</div>
              </div>
            )}

            {view === "day" && (
              <div className="mx-auto flex min-h-0 w-full max-w-[1040px] flex-1 flex-col">
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="text-[13px] text-ink-3">
                    {dayOpen.length > 0 ? t("cal.pending", { n: dayOpen.length }) : t("cal.emptyDay")}
                  </span>
                  <span className="num text-[11.5px] text-ink-3">
                    已完成 {dayTasks.length - dayOpen.length}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {dayTasks.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
                      <p className="text-[13px] text-ink-2">这一天还没有安排</p>
                      <p className="text-[11.5px] text-ink-3">在下面写一件小事就行</p>
                    </div>
                  )}
                  {dayTasks.map((t) => {
                    const color = eventColor(t.listId, resolvedTheme, pack);
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color.text }} />
                        <span className="num w-24 shrink-0 text-[11px] text-ink-3">
                          {t.dueTime ? formatRange(t) : lang === "zh" ? "全天" : "All day"}
                        </span>
                        <TaskCheck
                          checked={t.done}
                          onChange={() => toggleTask(t.id)}
                          size={16}
                          disabled={locked}
                        />
                        <button
                          type="button"
                          onClick={() => openDetail(t.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span
                            className={cn(
                              "block truncate text-[13.5px]",
                              t.done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink"
                            )}
                          >
                            {t.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-3">
                            <span>{lists.find((l) => l.id === t.listId)?.emoji}</span>
                            <span className="truncate">
                              {lists.find((l) => l.id === t.listId)?.name}
                            </span>
                            {t.priority !== "none" && (
                              <span style={{ color: PRIORITIES.find((p) => p.value === t.priority)?.color }}>
                                · {PRIORITIES.find((p) => p.value === t.priority)?.label}
                              </span>
                            )}
                            {t.notes && <span>· 有备注</span>}
                          </span>
                        </button>
                        {!locked && (
                          <button
                            type="button"
                            aria-label="删除"
                            onClick={() => deleteTask(t.id)}
                            className="grid size-6 place-items-center rounded text-ink-3 opacity-0 transition hover:bg-black/5 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3">{addBar(selected)}</div>
              </div>
            )}
          </div>

          {view === "month" && (
            <aside className="flex w-[330px] shrink-0 flex-col border-l border-line/50">
              <div className="px-4 pt-1 pb-2">
                <p className="flex items-center gap-1 text-[11px] font-medium tracking-[0.1em] text-ink-3 uppercase">
                  {pack === "starry" && <StarBuddy size={12} className="text-[#F6C453]" />}
                  这一天
                </p>
                <p className="mt-1 text-[16px] font-semibold tracking-[-0.01em] text-ink">
                  {format(new Date(`${selected}T00:00:00`), lang === "zh" ? "M 月 d 日 EEEE" : "EEEE, MMM d", { locale })}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">
                  {dayOpen.length > 0 ? t("cal.pending", { n: dayOpen.length }) : t("cal.emptyDay")}
                  {dayTasks.length - dayOpen.length > 0
                    ? ` · ${t("cal.doneCount", { n: dayTasks.length - dayOpen.length })}`
                    : ""}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-2">
                {dayOpen.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
                    <p className="text-[12.5px] text-ink-2">这天还没有安排</p>
                    <p className="text-[11px] text-ink-3">在下面写一件小事</p>
                  </div>
                )}
                {dayOpen.map((t) => (
                  <TaskLine
                    key={t.id}
                    task={t}
                    locked={locked}
                    onOpen={() => openDetail(t.id)}
                    onToggle={() => toggleTask(t.id)}
                    onDelete={() => deleteTask(t.id)}
                  />
                ))}
                {dayTasks.length > dayOpen.length && (
                  <p className="px-2 py-2 text-[10.5px] text-ink-3">
                    另有 {dayTasks.length - dayOpen.length} 项已完成
                  </p>
                )}
              </div>

              <div className="border-t border-line/70 p-3">
                {addBar(selected)}
                <p className="mt-1.5 px-0.5 text-[10.5px] text-ink-3">
                  {locked ? t("widget.locked") : t("widget.hint")}
                </p>
              </div>
            </aside>
          )}
        </div>
        </div>
      </div>

      <WidgetTaskDialog
        taskId={detailId}
        locked={locked}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
