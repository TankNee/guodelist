import { useMemo, useRef } from "react";
import { addDays, format, parseISO } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, RotateCcw } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useApp } from "@/store/useApp";
import { filterForView, visibleTasks, viewTitle } from "@/lib/select";
import { cn } from "@/lib/utils";
import { toKey } from "@/lib/date";
import type { Task } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT, useLang } from "@/lib/i18n";
import { DatePicker } from "./DatePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskRow } from "./TaskRow";
import { QuickAdd } from "./QuickAdd";

function SortableRow({
  task,
  listName,
  listEmoji,
  active,
  showList,
  onSelect,
  onToggle,
}: {
  task: Task;
  listName?: string;
  listEmoji?: string;
  active: boolean;
  showList: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-none", isDragging && "relative z-10 opacity-60")}
      {...listeners}
    >
      <TaskRow
        task={task}
        list={listName ? { id: task.listId, name: listName, emoji: listEmoji ?? "", groupId: "" } : undefined}
        active={active}
        showList={showList}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    </div>
  );
}

export function TaskListPanel() {
  const tasks = useApp((s) => s.tasks);
  const lists = useApp((s) => s.lists);
  const view = useApp((s) => s.view);
  const filter = useApp((s) => s.filter);
  const setFilter = useApp((s) => s.setFilter);
  const dayKey = useApp((s) => s.dayKey);
  const setDay = useApp((s) => s.setDay);
  const selectedTaskId = useApp((s) => s.selectedTaskId);
  const selectTask = useApp((s) => s.selectTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const reorderTask = useApp((s) => s.reorderTask);
  const resetDemo = useApp((s) => s.resetDemo);

  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const lang = useLang();
  const locale = lang === "zh" ? zhCN : enUS;

  const activeFilter = filterForView(view, filter);
  const rows = useMemo(
    () => visibleTasks(tasks, view, activeFilter, dayKey),
    [tasks, view, activeFilter, dayKey],
  );
  const title = viewTitle(view, lists);
  const activeList = view.kind === "list" ? view.listId : undefined;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const dateLabel = useMemo(() => {
    const d = parseISO(dayKey);
    return format(d, lang === "zh" ? "M月d日 EEEE" : "EEE, MMM d", { locale });
  }, [dayKey, lang, locale]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTask(String(active.id), String(over.id));
    }
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-line/80 bg-panel panel-shadow">
      <header className="px-9 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-[34px] leading-[1.08] font-bold tracking-[-0.038em] text-ink">
              {view.kind === "today"
                ? dayKey === toKey(new Date())
                  ? t("nav.today")
                  : format(parseISO(dayKey), "EEEE", { locale })
                : view.kind === "inbox"
                  ? t("nav.inbox")
                  : view.kind === "all"
                    ? t("nav.all")
                    : view.kind === "completed"
                      ? t("nav.done")
                      : view.kind === "calendar"
                        ? t("nav.calendar")
                        : title}
            </h1>
            <span className="shrink-0 text-[13px] font-medium text-ink-3">{dateLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              aria-label={t("list.prevDay")}
              onClick={() => setDay(toKey(addDays(parseISO(dayKey), -1)))}
              className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
            >
              <ChevronLeft size={15} strokeWidth={2.2} />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={t("list.jump")}
                  className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
                >
                  <CalendarDays size={15} strokeWidth={1.9} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-[252px] p-2.5">
                <label className="mb-1.5 block text-[11px] font-medium text-ink-3">{t("list.jumpTitle")}</label>
                <DatePicker value={dayKey} onChange={(d) => setDay(d)} />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label={t("list.nextDay")}
              onClick={() => setDay(toKey(addDays(parseISO(dayKey), 1)))}
              className="grid size-8 place-items-center rounded-full bg-panel-2 text-ink-2 transition hover:bg-line/70 hover:text-ink"
            >
              <ChevronRight size={15} strokeWidth={2.2} />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t("list.more")}
                  className="ml-1 grid size-8 place-items-center rounded-full text-ink-2 transition hover:bg-panel-2"
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[184px]">
                {view.kind !== "completed" && (
                  <DropdownMenuItem onClick={() => setFilter(filter === "open" ? "done" : "open")}>
                    {filter === "open" ? t("list.seeDone") : t("list.toOpen")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setDay(toKey(new Date()))}>{t("list.backToday")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetDemo} className="gap-2 text-ink-3">
                  <RotateCcw size={12.5} />
                  {t("list.resetDemo")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1">
          {view.kind !== "completed" && (
            <div className="flex items-center gap-0.5 rounded-full bg-panel-2 p-[3px]">
              {(["open", "done"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "h-[26px] rounded-full px-3 text-[12.5px] font-medium transition-colors",
                    filter === f
                      ? "bg-panel text-ink shadow-[0_1px_2px_rgba(28,26,23,0.08)]"
                      : "text-ink-3 hover:text-ink-2"
                  )}
                >
                  {f === "open" ? t("list.open") : t("list.done")}
                </button>
              ))}
            </div>
          )}
          <span className="ml-1 text-[12px] text-ink-3">
            {rows.length > 0 ? t("list.count", { n: rows.length }) : ""}
          </span>
        </div>
      </header>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-9 pb-8">
        {activeFilter === "open" && (
          <div className="border-b border-line/70 pb-1">
            <QuickAdd
              listId={activeList ?? "inbox"}
              defaultDue={view.kind === "today" ? dayKey : null}
              inputRef={inputRef}
            />
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-2 flex flex-col">
              {rows.map((task) => {
                const list = lists.find((l) => l.id === task.listId);
                return (
                  <SortableRow
                    key={task.id}
                    task={task}
                    listName={list?.name}
                    listEmoji={list?.emoji}
                    active={selectedTaskId === task.id}
                    showList={view.kind !== "list"}
                    onSelect={() => selectTask(task.id)}
                    onToggle={() => toggleTask(task.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {rows.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="mb-3 h-px w-10 bg-line-strong" />
            <p className="text-[14px] font-medium text-ink-2">
              {activeFilter === "done" ? t("list.emptyDone") : t("list.emptyToday")}
            </p>
            <p className="mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-ink-3">
              {activeFilter === "done"
                ? lang === "zh"
                  ? "勾掉一条任务，它会出现在这里。"
                  : "Complete a task and it lands here."
                : lang === "zh"
                  ? "把脑子里的事写下来，或者切到别的日期看看。"
                  : "Write down what's on your mind, or switch to another day."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
