import { describe, expect, it } from "vitest";
import type { Task, TaskList } from "@/types";
import { filterForView, isInView, sortTasks, visibleTasks, countOpen, viewTitle } from "@/lib/select";

const TODAY = "2026-11-06";

const task = (overrides: Partial<Task> & Pick<Task, "id">): Task => {
  const base: Task = {
    id: overrides.id,
    title: overrides.id,
    notes: "",
    listId: "inbox",
    done: false,
    completedAt: null,
    dueDate: null,
    dueTime: null,
    endTime: null,
    priority: "medium",
    labels: [],
    subtasks: [],
    attachments: [],
    recurrence: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    order: 0,
  };
  return { ...base, ...overrides, title: overrides.title ?? overrides.id };
};

const list = (id: string, nameOr: string | Partial<TaskList> = id): TaskList => ({
  id,
  name: typeof nameOr === "string" ? nameOr : id,
  emoji: "📋",
  groupId: "projects",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...(typeof nameOr === "string" ? {} : nameOr),
});

describe("Today view", () => {
  it("includes only tasks whose dueDate is exactly today", () => {
    const rows = visibleTasks(
      [
        task({ id: "today", dueDate: TODAY, listId: "inbox" }),
        task({ id: "overdue", dueDate: "2026-11-02", listId: "inbox" }),
        task({ id: "yesterday", dueDate: "2026-11-05", listId: "inbox" }),
        task({ id: "future", dueDate: "2026-11-07", listId: "inbox" }),
        task({ id: "none", dueDate: null, listId: "inbox" }),
      ],
      { kind: "today" },
      "open",
      TODAY,
    );

    expect(rows.map((row) => row.id)).toEqual(["today"]);
  });

  it("does not treat overdue tasks as today even when viewing the real today", () => {
    const rows = visibleTasks(
      [
        task({ id: "overdue", dueDate: "2026-11-02" }),
        task({ id: "today", dueDate: TODAY }),
      ],
      { kind: "today" },
      "open",
      TODAY,
    );

    expect(rows.map((row) => row.id)).toEqual(["today"]);
    expect(isInView(task({ id: "overdue", dueDate: "2026-11-02" }), { kind: "today" }, TODAY)).toBe(false);
  });

  it("filters done tasks and still limits the view to today", () => {
    const rows = visibleTasks(
      [
        task({ id: "done", dueDate: TODAY, done: true, completedAt: "2026-11-06T09:00:00.000Z" }),
        task({ id: "open", dueDate: TODAY }),
        task({ id: "old-done", dueDate: "2026-11-02", done: true, completedAt: "2026-11-02T09:00:00.000Z" }),
      ],
      { kind: "today" },
      "done",
      TODAY,
    );

    expect(rows.map((row) => row.id)).toEqual(["done"]);
  });

  it("keeps overdue tasks visible in All", () => {
    const rows = visibleTasks(
      [
        task({ id: "overdue", dueDate: "2026-11-02" }),
        task({ id: "today", dueDate: TODAY }),
      ],
      { kind: "all" },
      "open",
      TODAY,
    );
    expect(rows.map((row) => row.id)).toEqual(["overdue", "today"]);
  });

  it("excludes archived tasks from every view", () => {
    const rows = visibleTasks(
      [
        task({ id: "archived", dueDate: TODAY, archived: true }),
        task({ id: "live", dueDate: TODAY }),
      ],
      { kind: "today" },
      "open",
      TODAY,
    );
    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });

  it("sorts by date, then time, then manual order", () => {
    const rows = sortTasks([
      task({ id: "b", dueDate: TODAY, dueTime: "10:00", order: 1 }),
      task({ id: "a", dueDate: TODAY, dueTime: "09:00", order: 2 }),
      task({ id: "c", dueDate: "2026-11-07", order: 0 }),
      task({ id: "d", dueDate: TODAY, dueTime: null, order: 0 }),
      task({ id: "e", dueDate: TODAY, dueTime: "09:00", order: 1 }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(["e", "a", "b", "d", "c"]);
  });

  it("filters by list and inbox", () => {
    const tasks = [
      task({ id: "inbox", listId: "inbox", dueDate: null }),
      task({ id: "work", listId: "work", dueDate: null }),
    ];
    expect(visibleTasks(tasks, { kind: "inbox" }, "open", TODAY).map((t) => t.id)).toEqual(["inbox"]);
    expect(visibleTasks(tasks, { kind: "list", listId: "work" }, "open", TODAY).map((t) => t.id)).toEqual([
      "work",
    ]);
    expect(list("work").name).toBe("work");
  });

  it("forces the completed screen to the done filter", () => {
    expect(filterForView({ kind: "completed" }, "open")).toBe("done");
    expect(filterForView({ kind: "completed" }, "done")).toBe("done");
    expect(filterForView({ kind: "today" }, "open")).toBe("open");
    expect(filterForView({ kind: "today" }, "done")).toBe("done");
  });

  it("shows only completed tasks in the completed view", () => {
    const rows = visibleTasks(
      [
        task({ id: "open", dueDate: TODAY }),
        task({ id: "done", dueDate: TODAY, done: true, completedAt: "2026-11-06T09:00:00.000Z" }),
      ],
      { kind: "completed" },
      "done",
      TODAY,
    );
    expect(rows.map((row) => row.id)).toEqual(["done"]);
  });

  it("counts only open, unarchived tasks matching the predicate", () => {
    const tasks = [
      task({ id: "open" }),
      task({ id: "done", done: true }),
      task({ id: "archived", archived: true }),
      task({ id: "other", listId: "other" }),
    ];
    expect(countOpen(tasks, (t) => t.listId === "inbox")).toBe(1);
  });

  it("handles calendar and unknown views as a full collection", () => {
    const tasks = [task({ id: "open" }), task({ id: "done", done: true })];
    expect(isInView(tasks[0], { kind: "calendar" }, TODAY)).toBe(true);
    expect(visibleTasks(tasks, { kind: "calendar" }, "open", TODAY).map((t) => t.id)).toEqual(["open"]);
  });

  it("returns localized titles and a list fallback", () => {
    expect(viewTitle({ kind: "today" }, [])).toBe("今天");
    expect(viewTitle({ kind: "inbox" }, [])).toBe("收件箱");
    expect(viewTitle({ kind: "all" }, [])).toBe("全部任务");
    expect(viewTitle({ kind: "completed" }, [])).toBe("已完成");
    expect(viewTitle({ kind: "calendar" }, [])).toBe("日历");
    expect(viewTitle({ kind: "list", listId: "missing" }, [])).toBe("清单");
    expect(viewTitle({ kind: "list", listId: "work" }, [list("work", { name: "工作" })])).toBe("工作");
  });
});
