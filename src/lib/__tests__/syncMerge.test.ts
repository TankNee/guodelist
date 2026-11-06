import { describe, expect, it } from "vitest";
import type { Task, TaskList } from "@/types";
import { mergeRemote, type LocalCollections, type Tombstones } from "@/lib/syncMerge";

const task = (overrides: Partial<Task> & Pick<Task, "id">): Task => {
  const base: Task = {
    id: overrides.id,
    title: overrides.id,
    notes: "",
    listId: "work",
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
    updatedAt: "2026-11-01T00:00:00.000Z",
    order: 0,
  };
  return { ...base, ...overrides, title: overrides.title ?? overrides.id };
};

const list = (id: string, overrides: Partial<TaskList> = {}): TaskList => ({
  id,
  name: id,
  emoji: "📋",
  groupId: "projects",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...overrides,
});

const emptyTombstones = (): Tombstones => ({ tasks: {}, lists: {} });

const local = (overrides: Partial<LocalCollections> = {}): LocalCollections => ({
  tasks: [],
  lists: [],
  removed: emptyTombstones(),
  ...overrides,
});

describe("mergeRemote lists", () => {
  it("adds a list that only exists on the server", () => {
    const result = mergeRemote(local(), {
      lists: [list("life", { name: "生活", groupId: "home" })],
      tasks: [],
    });

    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]).toMatchObject({ id: "life", name: "生活", groupId: "home" });
  });

  it("keeps a newer local list rename", () => {
    const result = mergeRemote(
      local({ lists: [list("work", { name: "Local name", updatedAt: "2026-11-03T10:00:00.000Z" })] }),
      { lists: [list("work", { name: "Server old", updatedAt: "2026-11-02T10:00:00.000Z" })], tasks: [] },
    );

    expect(result.lists[0].name).toBe("Local name");
  });

  it("accepts a newer remote list rename", () => {
    const result = mergeRemote(
      local({ lists: [list("work", { name: "Old", updatedAt: "2026-11-02T10:00:00.000Z" })] }),
      { lists: [list("work", { name: "Renamed on phone", updatedAt: "2026-11-03T10:00:00.000Z" })], tasks: [] },
    );

    expect(result.lists[0].name).toBe("Renamed on phone");
  });

  it("deletes a list even when the tombstone timestamp is older", () => {
    const result = mergeRemote(
      local({ removed: { tasks: {}, lists: { work: "2026-11-01T10:00:00.000Z" } } }),
      { lists: [list("work", { updatedAt: "2026-11-02T10:00:00.000Z" })], tasks: [] },
    );

    expect(result.lists).toEqual([]);
    expect(result.removed.lists.work).toBe("2026-11-01T10:00:00.000Z");
  });

  it("deletes a list and its tasks when the tombstone is newer", () => {
    const result = mergeRemote(
      local({
        lists: [list("work")],
        tasks: [task({ id: "work-task", listId: "work" })],
      }),
      {
        lists: [],
        tasks: [],
        deleted: { lists: { work: "2026-11-06T10:00:00.000Z" }, tasks: {} },
      },
    );

    expect(result.lists).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.removed.lists.work).toBe("2026-11-06T10:00:00.000Z");
  });

  it("never deletes the virtual inbox list", () => {
    const result = mergeRemote(local({ lists: [list("inbox")] }), {
      lists: [],
      tasks: [],
      deleted: { lists: { inbox: "2026-11-06T10:00:00.000Z" }, tasks: {} },
    });

    expect(result.lists.map((item) => item.id)).toEqual(["inbox"]);
    expect(result.removed.lists).not.toHaveProperty("inbox");
  });

  it("ignores tombstones for ids this account does not know", () => {
    const result = mergeRemote(local({ lists: [list("work")] }), {
      lists: [list("life")],
      tasks: [],
      deleted: { lists: { ghost: "2026-11-06T10:00:00.000Z" }, tasks: {} },
    });

    expect(result.lists.map((item) => item.id).sort()).toEqual(["life", "work"]);
    expect(result.removed.lists).not.toHaveProperty("ghost");
  });

  it("keeps a deletion permanent when another client still has the list", () => {
    const result = mergeRemote(
      local({ lists: [list("work", { updatedAt: "2026-11-06T09:00:00.000Z" })] }),
      {
        lists: [],
        tasks: [],
        deleted: { lists: { work: "2026-11-06T08:00:00.000Z" }, tasks: {} },
      },
    );

    expect(result.lists).toEqual([]);
    expect(result.removed.lists.work).toBe("2026-11-06T08:00:00.000Z");
  });
});

describe("mergeRemote tasks", () => {
  it("does not let a task tombstone be overwritten by a live copy", () => {
    const result = mergeRemote(
      local({
        lists: [list("work")],
        tasks: [task({ id: "task-1", updatedAt: "2026-11-05T10:00:00.000Z" })],
        removed: { lists: {}, tasks: { "task-1": "2026-11-04T10:00:00.000Z" } },
      }),
      { lists: [], tasks: [] },
    );

    expect(result.tasks).toEqual([]);
    expect(result.removed.tasks["task-1"]).toBe("2026-11-04T10:00:00.000Z");
  });

  it("removes a task when the remote tombstone is newer", () => {
    const result = mergeRemote(
      local({
        lists: [list("work")],
        tasks: [task({ id: "task-1", updatedAt: "2026-11-04T10:00:00.000Z" })],
      }),
      {
        lists: [],
        tasks: [],
        deleted: { lists: {}, tasks: { "task-1": "2026-11-05T10:00:00.000Z" } },
      },
    );

    expect(result.tasks).toEqual([]);
    expect(result.removed.tasks["task-1"]).toBe("2026-11-05T10:00:00.000Z");
  });

  it("accepts a newer remote task and keeps a newer local task", () => {
    const result = mergeRemote(
      local({
        lists: [list("work")],
        tasks: [
          task({ id: "old", title: "old local", updatedAt: "2026-11-05T10:00:00.000Z" }),
          task({ id: "new", title: "new local", updatedAt: "2026-11-06T10:00:00.000Z" }),
        ],
      }),
      {
        lists: [],
        tasks: [
          task({ id: "old", title: "old remote", updatedAt: "2026-11-04T10:00:00.000Z" }),
          task({ id: "new", title: "new remote", updatedAt: "2026-11-06T11:00:00.000Z" }),
        ],
      },
    );

    expect(result.tasks.find((item) => item.id === "old")?.title).toBe("old local");
    expect(result.tasks.find((item) => item.id === "new")?.title).toBe("new remote");
  });

  it("moves a task to a server list that arrived in the same response", () => {
    const result = mergeRemote(local({ tasks: [task({ id: "task-1", listId: "work" })] }), {
      lists: [list("life", { name: "生活" })],
      tasks: [task({ id: "task-1", listId: "life", updatedAt: "2026-11-06T12:00:00.000Z" })],
    });

    expect(result.tasks[0].listId).toBe("life");
    expect(result.lists.map((item) => item.id)).toContain("life");
  });

  it("cleans tombstones after cascading a list delete", () => {
    const result = mergeRemote(
      local({
        lists: [list("work")],
        tasks: [task({ id: "task-1", listId: "work" })],
        removed: { lists: { work: "2026-11-01T10:00:00.000Z" }, tasks: {} },
      }),
      {
        lists: [],
        tasks: [],
        deleted: { lists: { work: "2026-11-06T10:00:00.000Z" }, tasks: {} },
      },
    );

    expect(result.lists).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.removed.lists.work).toBe("2026-11-06T10:00:00.000Z");
  });

  it("accepts records that do not carry timestamps", () => {
    const result = mergeRemote(local({ lists: [list("work", { updatedAt: undefined })] }), {
      lists: [list("life", { updatedAt: undefined })],
      tasks: [task({ id: "task-1", listId: "life", updatedAt: undefined })],
    });

    expect(result.lists.map((item) => item.id).sort()).toEqual(["life", "work"]);
    expect(result.tasks.map((item) => item.id)).toEqual(["task-1"]);
  });

  it("drops a task whose list was deleted even when the task itself is newer", () => {
    const result = mergeRemote(
      local({
        lists: [list("work", { updatedAt: "2026-11-01T00:00:00.000Z" })],
        tasks: [task({ id: "task-1", listId: "work", updatedAt: "2026-11-06T12:00:00.000Z" })],
      }),
      {
        lists: [],
        tasks: [],
        deleted: { lists: { work: "2026-11-06T10:00:00.000Z" }, tasks: {} },
      },
    );

    expect(result.tasks).toEqual([]);
  });

  it("keeps a local tombstone when the record is still absent", () => {
    const result = mergeRemote(
      local({ removed: { lists: {}, tasks: { gone: "2026-11-01T00:00:00.000Z" } } }),
      { lists: [], tasks: [] },
    );

    expect(result.removed.tasks.gone).toBe("2026-11-01T00:00:00.000Z");
  });
});
