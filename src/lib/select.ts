import type { Filter, Task, TaskList, View } from "@/types";

const dueRank = (t: Task) => t.dueDate ?? "9999-12-31";

/** Completed is a completed-only screen; never show the open filter there. */
export function filterForView(view: View, filter: Filter): Filter {
  return view.kind === "completed" ? "done" : filter;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const d = dueRank(a).localeCompare(dueRank(b));
    if (d !== 0) return d;
    const timeA = a.dueTime ?? "99:99";
    const timeB = b.dueTime ?? "99:99";
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return a.order - b.order;
  });
}

export function isInView(task: Task, view: View, dayKey: string): boolean {
  if (task.archived) return false;
  switch (view.kind) {
    case "today": {
      // Today is strictly today's date. Overdue tasks remain visible in All,
      // but must not leak into the Today list.
      return task.dueDate === dayKey;
    }
    case "inbox":
      return task.listId === "inbox";
    case "all":
      return true;
    case "completed":
      return task.done;
    case "list":
      return task.listId === view.listId;
    default:
      return true;
  }
}

export function visibleTasks(
  tasks: Task[],
  view: View,
  filter: "open" | "done",
  dayKey: string
): Task[] {
  const inView = tasks.filter((t) => isInView(t, view, dayKey));
  const filtered = inView.filter((t) => (filter === "done" ? t.done : !t.done));
  if (filter === "done") {
    return [...filtered].sort((a, b) =>
      (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
    );
  }
  return sortTasks(filtered);
}

export function countOpen(tasks: Task[], predicate: (t: Task) => boolean): number {
  return tasks.filter((t) => !t.done && !t.archived && predicate(t)).length;
}

export function viewTitle(view: View, lists: TaskList[]): string {
  switch (view.kind) {
    case "today":
      return "今天";
    case "inbox":
      return "收件箱";
    case "all":
      return "全部任务";
    case "completed":
      return "已完成";
    case "calendar":
      return "日历";
    case "list":
      return lists.find((l) => l.id === view.listId)?.name ?? "清单";
  }
}
