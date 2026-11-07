import type { Task, TaskList } from "@/types";

export interface Tombstones {
  tasks: Record<string, string>;
  lists: Record<string, string>;
}

export interface LocalCollections {
  tasks: Task[];
  lists: TaskList[];
  removed: Tombstones;
}

export interface RemoteCollections {
  tasks: Task[];
  lists: TaskList[];
  deleted?: Tombstones;
}

/**
 * Pure last-write-wins merge shared by the desktop store and its tests.
 *
 * Rules:
 * - a live record always wins over a tombstone older than the record;
 * - tombstones only affect ids this device or the incoming snapshot knows;
 * - the virtual inbox list can never be deleted;
 * - foreign/global tombstones are ignored;
 * - a list deletion cascades to its tasks.
 */
export function mergeRemote(local: LocalCollections, remote: RemoteCollections): LocalCollections {
  const localTaskIds = new Set(local.tasks.map((task) => task.id));
  const remoteTaskIds = new Set(remote.tasks.map((task) => task.id));
  const localListIds = new Set(local.lists.map((list) => list.id));
  local.tasks.forEach((task) => localListIds.add(task.listId));
  const remoteListIds = new Set(remote.lists.map((list) => list.id));

  const acceptedTasks = Object.fromEntries(
    Object.entries(remote.deleted?.tasks ?? {}).filter(
      ([id]) => localTaskIds.has(id) || remoteTaskIds.has(id) || Boolean(local.removed.tasks[id]),
    ),
  );
  const acceptedLists = Object.fromEntries(
    Object.entries(remote.deleted?.lists ?? {}).filter(
      ([id]) =>
        id !== "inbox" &&
        (localListIds.has(id) || remoteListIds.has(id) || Boolean(local.removed.lists[id])),
    ),
  );
  const deadTasks = { ...local.removed.tasks, ...acceptedTasks };
  const deadLists = { ...local.removed.lists, ...acceptedLists };
  delete deadLists.inbox;

  const wins = (incoming: { updatedAt?: string }, existing?: { updatedAt?: string }) =>
    !existing || String(incoming.updatedAt ?? "") >= String(existing.updatedAt ?? "");

  const taskMap = new Map(local.tasks.map((task) => [task.id, task] as const));
  for (const incoming of remote.tasks) {
    if (deadTasks[incoming.id]) continue;
    if (wins(incoming, taskMap.get(incoming.id))) taskMap.set(incoming.id, incoming);
  }

  const listMap = new Map(local.lists.map((list) => [list.id, list] as const));
  for (const incoming of remote.lists) {
    if (deadLists[incoming.id]) continue;
    if (wins(incoming, listMap.get(incoming.id))) listMap.set(incoming.id, incoming);
  }

  // Tombstones are final. This is deliberate: a device that still has an old
  // copy must not resurrect a list/task the user already deleted.
  const lists = [...listMap.values()].filter((list) => !deadLists[list.id]);
  const tasks = [...taskMap.values()].filter(
    (task) => !deadTasks[task.id] && !deadLists[task.listId],
  );

  return {
    tasks,
    lists,
    removed: { tasks: deadTasks, lists: deadLists },
  };
}
