import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Flag,
  Plus,
  Repeat,
  Tag,
  Trash2,
} from "lucide-react";
import type { Priority, Task, TaskList } from "@/types";
import { PRIORITIES } from "@/types";
import { dueState, formatDueWithTime } from "@/lib/date";
import { describeRecurrence } from "@/lib/recurrence";
import { useLang, useT } from "@/lib/i18n";
import { DatePicker } from "./DatePicker";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const chip =
  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors";
const chipSet = "border-line bg-panel text-ink-2 hover:bg-panel-2";
const chipUnset = "border-dashed border-line-strong text-ink-3 hover:bg-panel-2 hover:text-ink-2";

export function DueChip({ task }: { task: Task }) {
  const updateTask = useApp((s) => s.updateTask);
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const state = dueState(task.dueDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            chip,
            task.dueDate ? chipSet : chipUnset,
            state === "overdue" && "border-[#c2452f]/25 bg-[#c2452f]/8 text-[#c2452f]",
            state === "today" && "border-brand/25 bg-brand/8 text-brand-ink"
          )}
        >
          <CalendarDays size={12.5} strokeWidth={2.1} />
          {task.dueDate
            ? task.dueTime
              ? `${formatDueWithTime(task.dueDate, null, lang)} ${task.dueTime}${task.endTime ? `–${task.endTime}` : ""}`
              : formatDueWithTime(task.dueDate, null, lang)
            : t("chip.date")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[262px] p-2.5">
        <div className="px-1 pb-1">
          <label className="mb-1.5 block text-[11px] font-medium text-ink-3">选择日期</label>
          <DatePicker
            value={task.dueDate}
            onChange={(d) => updateTask(task.id, { dueDate: d })}
            onClear={() => updateTask(task.id, { dueDate: null, dueTime: null, endTime: null })}
          />

          <label className="mt-2.5 mb-1.5 block text-[11px] font-medium text-ink-3">
            时间（可选结束）
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              type="time"
              value={task.dueTime ?? ""}
              onChange={(e) =>
                updateTask(task.id, {
                  dueTime: e.target.value || null,
                  endTime: e.target.value ? task.endTime : null,
                })
              }
              className="h-8 text-[12.5px]"
              aria-label={t("chip.start")}
            />
            <span className="text-[11px] text-ink-3">→</span>
            <Input
              type="time"
              value={task.endTime ?? ""}
              onChange={(e) =>
                updateTask(task.id, { endTime: e.target.value || null })
              }
              className="h-8 text-[12.5px]"
              aria-label={t("chip.end")}
            />
          </div>

          <div className="mt-1.5 flex items-center gap-1">
            {[30, 60, 120].map((m) => (
              <button
                key={m}
                type="button"
                disabled={!task.dueTime}
                onClick={() => {
                  if (!task.dueTime) return;
                  const [h, min] = task.dueTime.split(":").map(Number);
                  const total = Math.min(24 * 60 - 1, h * 60 + min + m);
                  updateTask(task.id, {
                    endTime: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
                  });
                }}
                className="h-6 flex-1 rounded-md bg-panel-2 text-[11px] text-ink-2 transition hover:text-ink disabled:opacity-50"
              >
                {m < 60 ? `${m} 分钟` : `${m / 60} 小时`}
              </button>
            ))}
          </div>

          {task.dueDate && (
            <button
              type="button"
              onClick={() => {
                updateTask(task.id, { dueDate: null, dueTime: null, endTime: null });
                setOpen(false);
              }}
              className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-md text-[11.5px] text-ink-3 transition hover:bg-panel-2 hover:text-ink"
            >
              <Trash2 size={12} />
              清除日期与时间
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PriorityChip({ task }: { task: Task }) {
  const updateTask = useApp((s) => s.updateTask);
  const t = useT();
  const current = PRIORITIES.find((p) => p.value === task.priority) ?? PRIORITIES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(chip, task.priority === "none" ? chipUnset : chipSet)}
          style={task.priority !== "none" ? { color: current.color } : undefined}
        >
          <Flag size={12.5} strokeWidth={2.1} />
          {task.priority === "none" ? t("priority.none") : t(`priority.${task.priority}` as never)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[168px]">
        <DropdownMenuLabel className="text-[11px] font-medium text-ink-3">优先级</DropdownMenuLabel>
        {PRIORITIES.filter((p) => p.value !== "none").map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => updateTask(task.id, { priority: p.value as Priority })}
            className="gap-2 text-[13px]"
          >
            <Flag size={12} style={{ color: p.color }} strokeWidth={2.4} />
            <span className="flex-1">{p.label}</span>
            {task.priority === p.value && <Check size={13} className="text-ink-3" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => updateTask(task.id, { priority: "none" })}
          className="text-[13px] text-ink-3"
        >
          清除优先级
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ListChip({ task, lists }: { task: Task; lists: TaskList[] }) {
  const updateTask = useApp((s) => s.updateTask);
  const t = useT();
  const list = lists.find((l) => l.id === task.listId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(chip, chipSet)}>
          <span className="text-[11.5px] leading-none">{list?.emoji}</span>
          <span className="max-w-[120px] truncate">{list?.name ?? t("chip.list")}</span>
          <ChevronDown size={11} className="text-ink-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[280px] w-[196px] overflow-y-auto">
        <DropdownMenuLabel className="text-[11px] font-medium text-ink-3">移动到清单</DropdownMenuLabel>
        {lists.map((l) => (
          <DropdownMenuItem
            key={l.id}
            onClick={() => updateTask(task.id, { listId: l.id })}
            className="gap-2 text-[13px]"
          >
            <span>{l.emoji}</span>
            <span className="flex-1 truncate">{l.name}</span>
            {l.id === task.listId && <Check size={13} className="text-ink-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RecurrenceChip({ task }: { task: Task }) {
  const t = useT();
  const updateTask = useApp((s) => s.updateTask);
  const label = task.recurrence ? describeRecurrence(task.recurrence) : t("chip.repeat");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(chip, task.recurrence ? chipSet : chipUnset)}>
          <Repeat size={12.5} strokeWidth={2.1} />
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[176px]">
        <DropdownMenuLabel className="text-[11px] font-medium text-ink-3">重复</DropdownMenuLabel>
        {[
          { key: "daily", label: t("chip.everyDay") },
          { key: "weekdays", label: t("chip.everyWeekday") },
          { key: "weekly", label: t("chip.everyWeek") },
          { key: "monthly", label: t("chip.everyMonth") },
        ].map((o) => (
          <DropdownMenuItem
            key={o.key}
            className="text-[13px]"
            onClick={() =>
              updateTask(task.id, {
                recurrence: {
                  freq: o.key as "daily" | "weekdays" | "weekly" | "monthly",
                  interval: 1,
                  weekdays:
                    o.key === "weekly"
                      ? [task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getDay() : new Date().getDay()]
                      : undefined,
                },
              })
            }
          >
            {o.label}
            {task.recurrence?.freq === o.key && <Check size={13} className="ml-auto text-ink-3" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => updateTask(task.id, { recurrence: null })}
          className="text-[13px] text-ink-3"
        >
          不重复
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TimeRangeChip({ task }: { task: Task }) {
  const t = useT();
  const updateTask = useApp((s) => s.updateTask);
  const [open, setOpen] = useState(false);

  const start = task.dueTime;
  const end = task.endTime;
  const label = start ? `${start}${end ? `–${end}` : ""}` : t("chip.time");

  const setStart = (value: string) => {
    if (!value) {
      updateTask(task.id, { dueTime: null, endTime: null });
      return;
    }
    updateTask(task.id, { dueTime: value });
  };

  const setDuration = (minutes: number) => {
    if (!start) return;
    const [h, m] = start.split(":").map(Number);
    const total = Math.min(24 * 60 - 1, h * 60 + m + minutes);
    updateTask(task.id, {
      endTime: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(chip, start ? chipSet : chipUnset)}>
          <Clock size={12.5} strokeWidth={2.1} />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[248px] p-2.5">
        <p className="mb-1.5 text-[11px] font-medium text-ink-3">时间段</p>
        <div className="flex items-center gap-1.5">
          <Input
            type="time"
            value={start ?? ""}
            onChange={(e) => setStart(e.target.value)}
            className="h-8 text-[12.5px]"
            aria-label="开始时间"
          />
          <span className="text-[11px] text-ink-3">→</span>
          <Input
            type="time"
            value={end ?? ""}
            onChange={(e) => updateTask(task.id, { endTime: e.target.value || null })}
            className="h-8 text-[12.5px]"
            aria-label="结束时间"
          />
        </div>
        <div className="mt-2 flex items-center gap-1">
          {[30, 60, 120].map((m) => (
            <button
              key={m}
              type="button"
              disabled={!start}
              onClick={() => setDuration(m)}
              className="h-6 rounded-md bg-panel-2 px-2 text-[11px] text-ink-2 transition hover:text-ink disabled:opacity-50"
            >
              {m < 60 ? `${m} 分钟` : `${m / 60} 小时`}
            </button>
          ))}
        </div>
        {start && (
          <button
            type="button"
            onClick={() => setStart("")}
            className="mt-2 flex h-7 w-full items-center justify-center rounded-md text-[11.5px] text-ink-3 transition hover:bg-panel-2 hover:text-ink"
          >
            清除时间
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ReminderChip({ task }: { task: Task }) {
  const t = useT();
  const updateTask = useApp((s) => s.updateTask);
  const defaultReminder = useApp((s) => s.settings.defaultReminder);

  const effective = task.reminderMinutes ?? (task.dueTime ? defaultReminder : null);
  const label =
    effective === null
      ? t("chip.reminderNone")
      : effective === 0
        ? t("chip.reminderOnTime")
        : effective < 60
          ? t("chip.reminderMin", { n: effective })
          : effective < 1440
            ? t("chip.reminderHour", { n: effective / 60 })
            : t("chip.reminderDay");

  const options: { value: number | null; label: string }[] = [
    { value: null, label: t("chip.reminderNone") },
    { value: 0, label: t("chip.reminderOnTime") },
    { value: 5, label: t("chip.reminderMin", { n: 5 }) },
    { value: 15, label: t("chip.reminderMin", { n: 15 }) },
    { value: 30, label: t("chip.reminderMin", { n: 30 }) },
    { value: 60, label: t("chip.reminderHour", { n: 1 }) },
    { value: 1440, label: t("chip.reminderDay") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(chip, effective === null ? chipUnset : chipSet)}>
          <Bell size={12.5} strokeWidth={2.1} />
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[190px]">
        <DropdownMenuLabel className="text-[11px] font-medium text-ink-3">
          {t("chip.reminder")}
        </DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuItem
            key={String(o.value)}
            onClick={() => updateTask(task.id, { reminderMinutes: o.value, notifiedAt: null })}
            className="text-[13px]"
          >
            {o.label}
            {effective === o.value && <Check size={13} className="ml-auto text-ink-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LabelChip({ task }: { task: Task }) {
  const t = useT();
  const updateTask = useApp((s) => s.updateTask);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const add = () => {
    const label = value.trim();
    if (label && !task.labels.includes(label)) {
      updateTask(task.id, { labels: [...task.labels, label] });
    }
    setValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(chip, task.labels.length ? chipSet : chipUnset)}>
          <Tag size={12.5} strokeWidth={2.1} />
          {task.labels.length ? task.labels.join("、") : t("chip.label")}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-2">
        {task.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {task.labels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  updateTask(task.id, { labels: task.labels.filter((l) => l !== label) })
                }
                className="inline-flex items-center gap-1 rounded-full bg-panel-2 px-2 py-[3px] text-[11.5px] text-ink-2 transition hover:text-ink"
              >
                #{label}
                <span className="text-ink-3">×</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={t("chip.label")}
            className="h-8 text-[12.5px]"
          />
          <Button size="icon" variant="ghost" onClick={add} className="size-8 shrink-0">
            <Plus size={14} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
