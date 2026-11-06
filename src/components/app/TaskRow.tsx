import { CalendarDays, Flag, ListChecks, AlignLeft, PanelRight, Paperclip, Repeat, Archive, Copy, Trash2, CheckCircle2 } from "lucide-react";
import type { Task, TaskList } from "@/types";
import { PRIORITIES } from "@/types";
import { useApp } from "@/store/useApp";
import { dueState, formatDueWithTime } from "@/lib/date";
import { useLang, useT } from "@/lib/i18n";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { formatRange } from "@/lib/time";
import { describeRecurrence } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import { TaskCheck } from "./TaskCheck";

export function TaskRow({
  task,
  list,
  active,
  showList = true,
  onSelect,
  onToggle,
}: {
  task: Task;
  list?: TaskList;
  active: boolean;
  showList?: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  const due = dueState(task.dueDate);
  const lang = useLang();
  const t = useT();
  const archiveTask = useApp((s) => s.archiveTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const priority = PRIORITIES.find((p) => p.value === task.priority);
  const doneCount = task.subtasks.filter((s) => s.done).length;
  const hasMeta =
    showList || task.dueDate || task.priority !== "none" || task.labels.length > 0 || task.notes;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative -mx-3 flex cursor-default items-start gap-3 rounded-[11px] px-3 py-[9px] transition-colors",
        active
          ? "bg-[#f0ece5] dark:bg-white/[0.055]"
          : "hover:bg-black/[0.028] dark:hover:bg-white/[0.035]"
      )}
    >
      {active && (
        <span className="absolute top-1/2 right-[-12px] h-7 w-[2px] -translate-y-1/2 rounded-full bg-brand" />
      )}

      <div className="pt-[3px]">
        <TaskCheck checked={task.done} onChange={onToggle} />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-[15px] leading-[1.35] font-medium tracking-[-0.006em]",
            task.done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink"
          )}
        >
          {task.title}
        </div>

        {hasMeta && (
          <div className="mt-[3px] flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-ink-3">
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  due === "overdue" && "text-[#c2452f]",
                  due === "today" && "text-brand-ink"
                )}
              >
                <CalendarDays size={11.5} strokeWidth={2} />
                {task.dueTime
                  ? `${formatDueWithTime(task.dueDate, null, lang)} ${formatRange(task)}`
                  : formatDueWithTime(task.dueDate, null, lang)}
              </span>
            )}

            {showList && list && (
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px] leading-none">{list.emoji}</span>
                <span className="max-w-[140px] truncate">{list.name}</span>
              </span>
            )}

            {task.priority !== "none" && priority && (
              <span className="inline-flex items-center gap-1" style={{ color: priority.color }}>
                <Flag size={11.5} strokeWidth={2.2} />
                {priority.label}
              </span>
            )}

            {task.labels.map((label) => (
              <span key={label} className="inline-flex items-center gap-1 text-ink-3">
                <span className="text-ink-3">#</span>
                {label}
              </span>
            ))}

            {task.notes && (
              <span className="inline-flex items-center gap-1" aria-label="有备注">
                <AlignLeft size={11.5} strokeWidth={2} />
              </span>
            )}

            {task.recurrence && (
              <span className="inline-flex items-center gap-1" aria-label="重复任务">
                <Repeat size={11.5} strokeWidth={2} />
                {describeRecurrence(task.recurrence)}
              </span>
            )}

            {task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ListChecks size={11.5} strokeWidth={2} />
                <span className="num">
                  {doneCount}/{task.subtasks.length}
                </span>
              </span>
            )}

            {task.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip size={11.5} strokeWidth={2} />
                <span className="num">{task.attachments.length}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="打开任务详情"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={cn(
          "mt-[1px] grid size-6 shrink-0 place-items-center rounded-md text-ink-3 transition",
          active
            ? "opacity-100 hover:bg-black/[0.06]"
            : "opacity-0 hover:bg-black/[0.06] group-hover:opacity-100"
        )}
      >
        <PanelRight size={14} strokeWidth={1.9} />
      </button>
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[188px]">
        <ContextMenuItem onSelect={onSelect}>
          <PanelRight size={13} className="mr-2 text-ink-3" />
          {t("task.open")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggle}>
          <CheckCircle2 size={13} className="mr-2 text-ink-3" />
          {task.done ? t("task.uncomplete") : t("task.markDone")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => archiveTask(task.id, !task.archived)}>
          <Archive size={13} className="mr-2 text-ink-3" />
          {task.archived ? t("task.unarchive") : t("task.archive")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => void navigator.clipboard?.writeText(task.title)}>
          <Copy size={13} className="mr-2 text-ink-3" />
          {t("task.copyTitle")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => deleteTask(task.id)}
          className="text-[#b3261e] focus:bg-[#fbeeec] focus:text-[#b3261e]"
        >
          <Trash2 size={13} className="mr-2" />
          {t("task.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
