import { useEffect, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/store/useApp";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCheck } from "@/components/app/TaskCheck";
import { DueChip, LabelChip, ListChip, PriorityChip, RecurrenceChip, ReminderChip } from "@/components/app/DetailChips";
import { RichText } from "@/components/app/RichText";
import { formatDueWithTime } from "@/lib/date";
import { PRIORITIES } from "@/types";

export function WidgetTaskDialog({
  taskId,
  locked,
  onClose,
}: {
  taskId: string | null;
  locked: boolean;
  onClose: () => void;
}) {
  const task = useApp((s) => s.tasks.find((t) => t.id === s.selectedTaskId));
  const lists = useApp((s) => s.lists);
  const updateTask = useApp((s) => s.updateTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const addSubtask = useApp((s) => s.addSubtask);
  const toggleSubtask = useApp((s) => s.toggleSubtask);
  const removeSubtask = useApp((s) => s.removeSubtask);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [sub, setSub] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes);
    }
  }, [task?.id, task?.title, task?.notes]);

  const open = Boolean(taskId && task);
  const list = lists.find((l) => l.id === task?.listId);
  const priority = PRIORITIES.find((p) => p.value === task?.priority);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[82vh] w-[520px] max-w-[92vw] flex-col gap-0 overflow-hidden rounded-2xl border-line p-0 sm:max-w-[520px]">
        <DialogHeader className="sr-only">
          <DialogTitle>任务详情</DialogTitle>
          <DialogDescription>在桌面日历里查看和修改任务</DialogDescription>
        </DialogHeader>

        {task && (
          <>
            <div className="flex items-start gap-2.5 border-b border-line px-4 py-3.5">
              <div className="pt-[5px]">
                <TaskCheck
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  size={17}
                  disabled={locked}
                />
              </div>
              <input
                value={title}
                disabled={locked}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title.trim() && title !== task.title) updateTask(task.id, { title: title.trim() });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="min-w-0 flex-1 bg-transparent text-[17px] leading-snug font-semibold tracking-[-0.01em] text-ink outline-none disabled:opacity-80"
              />
              {locked && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-panel-2 px-2 py-0.5 text-[10.5px] text-ink-3">
                  <Lock size={10} />
                  只读
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
              {locked ? (
                <>
                  <span className="rounded-full bg-panel-2 px-2.5 py-1 text-[11.5px] text-ink-2">
                    {list?.emoji} {list?.name}
                  </span>
                  <span className="rounded-full bg-panel-2 px-2.5 py-1 text-[11.5px] text-ink-2">
                    {task.dueDate ? formatDueWithTime(task.dueDate, task.dueTime) : "无日期"}
                  </span>
                  {task.priority !== "none" && priority && (
                    <span
                      className="rounded-full bg-panel-2 px-2.5 py-1 text-[11.5px]"
                      style={{ color: priority.color }}
                    >
                      {priority.label}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <ListChip task={task} lists={lists} />
                  <DueChip task={task} />
                  <ReminderChip task={task} />
                  <PriorityChip task={task} />
                  <RecurrenceChip task={task} />
                  <LabelChip task={task} />
                </>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <h2 className="mb-1.5 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
                备注
              </h2>
              <RichText
                key={task.id}
                value={notes}
                editable={!locked}
                onChange={(md) => {
                  setNotes(md);
                  updateTask(task.id, { notes: md });
                }}
              />

              <h2 className="mt-4 mb-1.5 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
                子任务
              </h2>
              <div className="flex flex-col gap-0.5">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="group flex items-center gap-2.5 rounded-md py-1">
                    <TaskCheck
                      checked={st.done}
                      onChange={() => toggleSubtask(task.id, st.id)}
                      size={14}
                      disabled={locked}
                    />
                    <span
                      className={cn(
                        "flex-1 text-[13px] leading-snug",
                        st.done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink-2"
                      )}
                    >
                      {st.title}
                    </span>
                    {!locked && (
                      <button
                        type="button"
                        aria-label="删除子任务"
                        onClick={() => removeSubtask(task.id, st.id)}
                        className="grid size-6 place-items-center rounded text-ink-3 opacity-0 transition hover:bg-black/5 group-hover:opacity-100"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!locked && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="grid size-[14px] place-items-center rounded-full border border-dashed border-line-strong text-ink-3">
                    <Plus size={8} />
                  </span>
                  <input
                    value={sub}
                    onChange={(e) => setSub(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && sub.trim()) {
                        addSubtask(task.id, sub);
                        setSub("");
                      }
                    }}
                    placeholder="添加子任务，回车保存"
                    className="w-full bg-transparent py-1 text-[13px] text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-line px-4 py-2.5">
              <span className="text-[11px] text-ink-3">
                {locked ? "已锁定，解锁后可修改" : "改动会立刻同步到主窗口"}
              </span>
              <div className="flex items-center gap-1.5">
                {!locked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTask(task.id)}
                    className="h-7 gap-1 px-2 text-[12px] text-ink-3 hover:text-destructive"
                  >
                    <Trash2 size={12} />
                    删除
                  </Button>
                )}
                <Button size="sm" onClick={onClose} className="h-7 px-3 text-[12px]">
                  完成
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
