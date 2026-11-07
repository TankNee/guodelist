import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Attachment,
  Comment,
  Filter,
  ListGroup,
  Priority,
  Recurrence,
  Settings,
  Task,
  TaskList,
  ThemeMode,
  View,
} from "@/types";
import { groups as seedGroups, seedComments, seedLists, seedTasks } from "@/data/seed";
import { toKey } from "@/lib/date";
import { nextDueDate } from "@/lib/recurrence";
import { mergeRemote } from "@/lib/syncMerge";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

export interface NewTaskInput {
  title: string;
  listId?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Priority;
  notes?: string;
  recurrence?: Recurrence | null;
}

export const defaultSettings: Settings = {
  theme: "system",
  themePack: "classic",
  language: "zh",
  zoom: 1,
  sidebarWidth: 236,
  detailWidth: 404,
  widgetEnabled: false,
  widgetLocked: false,
  widgetSize: "standard",
  widgetOpacity: 0.8,
  notificationsEnabled: true,
  defaultReminder: 15,
  aiServerUrl: "",
};

interface AppState {
  lists: TaskList[];
  groups: ListGroup[];
  tasks: Task[];
  comments: Comment[];
  settings: Settings;

  view: View;
  filter: Filter;
  dayKey: string;
  selectedTaskId: string | null;
  detailOpen: boolean;
  settingsOpen: boolean;

  setView: (view: View) => void;
  setFilter: (filter: Filter) => void;
  setDay: (dayKey: string) => void;
  selectTask: (id: string | null) => void;
  closeDetail: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSettings: (patch: Partial<Settings>) => void;
  setTheme: (theme: ThemeMode) => void;

  addTask: (input: NewTaskInput) => string;
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  archiveTask: (id: string, archived?: boolean) => void;
  restoreArchived: () => void;
  reorderTask: (activeId: string, overId: string) => void;

  addList: (name: string, groupId: string, emoji?: string) => string;
  updateList: (id: string, patch: Partial<TaskList>) => void;
  duplicateList: (id: string) => void;
  deleteList: (id: string) => void;

  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;

  addComment: (taskId: string, body: string) => void;
  addAttachment: (taskId: string, attachment: Attachment) => void;
  removeAttachment: (taskId: string, attachmentId: string) => void;

  resetDemo: () => void;

  /** Tombstones for deletions so they survive a merge with the cloud. */
  removed: { tasks: Record<string, string>; lists: Record<string, string> };
  applyRemote: (payload: {
    lists: TaskList[];
    tasks: Task[];
    deleted?: { lists?: Record<string, string>; tasks?: Record<string, string> };
  }) => void;
}

const initial = {
  lists: seedLists,
  groups: seedGroups,
  tasks: seedTasks,
  comments: seedComments,
  settings: defaultSettings,
  view: { kind: "today" } as View,
  filter: "open" as Filter,
  dayKey: toKey(new Date()),
  selectedTaskId: null as string | null,
  detailOpen: false,
  settingsOpen: false,
  removed: { tasks: {}, lists: {} } as { tasks: Record<string, string>; lists: Record<string, string> },
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      setView: (view) => set({ view, selectedTaskId: null, detailOpen: false }),
      setFilter: (filter) => set({ filter }),
      setDay: (dayKey) => set({ dayKey }),
      selectTask: (id) =>
        set((s) => ({
          selectedTaskId: id,
          detailOpen: id ? true : s.detailOpen,
        })),
      closeDetail: () => set({ detailOpen: false, selectedTaskId: null }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),

      addTask: (input) => {
        const id = uid();
        const minOrder = Math.min(0, ...get().tasks.map((t) => t.order));
        const task: Task = {
          id,
          title: input.title.trim() || "未命名任务",
          notes: input.notes ?? "",
          listId: input.listId ?? "inbox",
          done: false,
          completedAt: null,
          dueDate: input.dueDate ?? null,
          dueTime: input.dueTime ?? null,
          endTime: null,
          priority: input.priority ?? "none",
          labels: [],
          subtasks: [],
          attachments: [],
          recurrence: input.recurrence ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: minOrder - 1,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return id;
      },

      toggleTask: (id) => {
        const current = get().tasks.find((t) => t.id === id);
        if (!current) return;

        // Completing a repeating task rolls it forward instead of losing the routine.
        if (!current.done && current.recurrence) {
          const next = nextDueDate(current);
          const spawn: Task = {
            ...current,
            id: uid(),
            done: false,
            completedAt: null,
            dueDate: next,
            subtasks: current.subtasks.map((s) => ({ ...s, done: false })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: current.order,
          };
          set((s) => ({
            tasks: [
              spawn,
              ...s.tasks.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      done: true,
                      completedAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      subtasks: t.subtasks.map((st) => ({ ...st, done: true })),
                    }
                  : t
              ),
            ],
          }));
          return;
        }

        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  done: !t.done,
                  completedAt: !t.done ? new Date().toISOString() : null,
                  updatedAt: new Date().toISOString(),
                  subtasks: !t.done
                    ? t.subtasks
                    : t.subtasks.map((st) => ({ ...st, done: true })),
                }
              : t
          ),
        }));
      },

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
          ),
        })),

      archiveTask: (id, archived = true) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, archived, updatedAt: new Date().toISOString() }
              : t
          ),
          selectedTaskId: archived && s.selectedTaskId === id ? null : s.selectedTaskId,
          detailOpen: archived && s.selectedTaskId === id ? false : s.detailOpen,
        })),

      restoreArchived: () =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.archived ? { ...t, archived: false, updatedAt: new Date().toISOString() } : t
          ),
        })),

      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          comments: s.comments.filter((c) => c.taskId !== id),
          selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
          detailOpen: s.selectedTaskId === id ? false : s.detailOpen,
          removed: { ...s.removed, tasks: { ...s.removed.tasks, [id]: new Date().toISOString() } },
        })),

      reorderTask: (activeId, overId) => {
        if (activeId === overId) return;
        set((s) => {
          const active = s.tasks.find((t) => t.id === activeId);
          const over = s.tasks.find((t) => t.id === overId);
          if (!active || !over) return {};

          const siblings = s.tasks
            .filter((t) => t.dueDate === active.dueDate)
            .sort((a, b) => a.order - b.order);
          const from = siblings.findIndex((t) => t.id === activeId);
          const to = siblings.findIndex((t) => t.id === overId);
          if (from < 0 || to < 0) return {};

          const next = [...siblings];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          const idx = next.findIndex((t) => t.id === activeId);
          const before = next[idx - 1];
          const after = next[idx + 1];

          let order = active.order;
          if (before && after) order = (before.order + after.order) / 2;
          else if (before) order = before.order + 1;
          else if (after) order = after.order - 1;

          return {
            tasks: s.tasks.map((t) => (t.id === activeId ? { ...t, order } : t)),
          };
        });
      },

      addList: (name, groupId, emoji = "📋") => {
        const id = uid();
        const stamp = new Date().toISOString();
        set((s) => ({
          lists: [
            ...s.lists,
            { id, name: name.trim() || "新清单", emoji, groupId, createdAt: stamp, updatedAt: stamp },
          ],
        }));
        return id;
      },

      updateList: (id, patch) =>
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l
          ),
        })),

      duplicateList: (id) =>
        set((s) => {
          const source = s.lists.find((l) => l.id === id);
          if (!source) return {};
          const newId = uid();
          const copiedTasks = s.tasks
            .filter((t) => t.listId === id)
            .map((t) => ({ ...t, id: uid(), listId: newId, order: t.order }));
          return {
            lists: [
              ...s.lists,
              { ...source, id: newId, name: `${source.name} 副本` },
            ],
            tasks: [...s.tasks, ...copiedTasks],
          };
        }),

      deleteList: (id) =>
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== id),
          tasks: s.tasks.filter((t) => t.listId !== id),
          view: s.view.listId === id ? { kind: "today" } : s.view,
          removed: { ...s.removed, lists: { ...s.removed.lists, [id]: new Date().toISOString() } },
        })),

      addSubtask: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: [
                    ...t.subtasks,
                    { id: uid(), title: title.trim(), done: false },
                  ],
                }
              : t
          ),
        })),

      toggleSubtask: (taskId, subtaskId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((st) =>
                    st.id === subtaskId ? { ...st, done: !st.done } : st
                  ),
                }
              : t
          ),
        })),

      removeSubtask: (taskId, subtaskId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) }
              : t
          ),
        })),

      addComment: (taskId, body) => {
        if (!body.trim()) return;
        set((s) => ({
          comments: [
            ...s.comments,
            {
              id: uid(),
              taskId,
              author: "我",
              body: body.trim(),
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      },

      addAttachment: (taskId, attachment) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, attachments: [...t.attachments, attachment] } : t
          ),
        })),

      removeAttachment: (taskId, attachmentId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) }
              : t
          ),
        })),

      applyRemote: ({ lists, tasks, deleted }) =>
        set((s) =>
          mergeRemote(s, {
            lists,
            tasks,
            deleted: deleted
              ? { tasks: deleted.tasks ?? {}, lists: deleted.lists ?? {} }
              : undefined,
          }),
        ),

      resetDemo: () => set({ ...initial, settings: get().settings }),
    }),
    {
      name: "guodelist:v1",
      version: 6,
      partialize: (s) => ({
        lists: s.lists,
        groups: s.groups,
        tasks: s.tasks,
        comments: s.comments,
        settings: s.settings,
        view: s.view,
        filter: s.filter,
        removed: s.removed,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState> & {
          tasks?: Task[];
          settings?: Partial<Settings>;
        };
        if (version < 2) {
          state.tasks = (state.tasks ?? []).map((t) => ({
            ...t,
            attachments: t.attachments ?? [],
            recurrence: t.recurrence ?? null,
          }));
        }
        if (version < 3) {
          state.tasks = (state.tasks ?? []).map((t) => ({
            ...t,
            endTime: t.endTime ?? null,
          }));
        }
        if (version < 4) {
          const stamp = new Date().toISOString();          state.tasks = (state.tasks ?? []).map((t) => ({
            ...t,
            updatedAt: t.updatedAt ?? t.createdAt ?? stamp,
          }));
          state.lists = (state.lists ?? []).map((l) => ({
            ...l,
            updatedAt: l.updatedAt ?? stamp,
          }));
          state.removed = state.removed ?? { tasks: {}, lists: {} };
        }
        if (version < 6) {
          // v5 clients could persist tombstones for records that are live.
          // That poisoned the sync loop; start clean once, then the normal
          // live-record-wins merge keeps it clean.
          state.removed = { tasks: {}, lists: {} };
          state.lists = (state.lists ?? []).map((l) => ({
            ...l,
            groupId: l.groupId || "projects",
          }));
        }
        state.settings = { ...defaultSettings, ...(state.settings ?? {}) };
        return state as AppState;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> & { settings?: Partial<Settings> };
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
        } as AppState;
      },
    }
  )
);
