import { create } from "zustand";
import { useApp } from "@/store/useApp";
import { api, tokenStore, type Account, type SyncPayload } from "./api";
import type { Task, TaskList } from "@/types";

type Status = "idle" | "syncing" | "ok" | "error";

interface CloudState {
  account: Account | null;
  status: Status;
  error: string;
  lastSync: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  sync: () => Promise<void>;
  hydrate: () => Promise<void>;
}

let timer: number | undefined;
let applying = false;
let lastSignature = "";
let started = false;
let queued = false;

const signature = (tasks: Task[], lists: TaskList[]) =>
  [...tasks.map((t) => `${t.id}:${t.updatedAt ?? ""}`), ...lists.map((l) => `${l.id}:${l.updatedAt ?? ""}`)]
    .sort()
    .join("|");

function buildPayload(): SyncPayload {
  const { tasks, lists, removed } = useApp.getState();
  return {
    lists: lists.map((l) => ({ ...l })),
    tasks: tasks.map((t) => ({ ...t })),
    deleted: { lists: removed.lists, tasks: removed.tasks },
  };
}

export const useCloud = create<CloudState>((set, get) => ({
  account: null,
  status: "idle",
  error: "",
  lastSync: null,

  hydrate: async () => {
    if (!tokenStore.get()) return;
    try {
      const { user } = await api.me();
      set({ account: user });
      await get().sync();
    } catch {
      tokenStore.clear();
      set({ account: null });
    }
  },

  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    tokenStore.set(token);
    set({ account: user, error: "" });
    await get().sync();
  },

  register: async (email, password, name) => {
    const { token, user } = await api.register(email, password, name);
    tokenStore.set(token);
    set({ account: user, error: "" });
    await get().sync();
  },

  logout: () => {
    tokenStore.clear();
    set({ account: null, status: "idle", lastSync: null });
  },

  sync: async () => {
    if (!get().account) return;
    // A local edit can land while a request is in flight. Remember it and
    // run one more merge after the current request instead of dropping it.
    if (get().status === "syncing") {
      queued = true;
      return;
    }
    set({ status: "syncing", error: "" });
    const runQueued = () => {
      if (!queued) return;
      queued = false;
      void get().sync();
    };
    try {
      lastSignature = signature(useApp.getState().tasks, useApp.getState().lists);
      const result = await api.sync(buildPayload());
      applying = true;
      useApp.getState().applyRemote({
        lists: result.lists as TaskList[],
        tasks: result.tasks as Task[],
        deleted: result.deleted,
      });
      applying = false;
      lastSignature = signature(useApp.getState().tasks, useApp.getState().lists);
      set({ status: "ok", lastSync: result.serverTime });
      runQueued();
    } catch (error) {
      applying = false;
      set({ status: "error", error: error instanceof Error ? error.message : "同步失败" });
      runQueued();
    }
  },
}));

/** Push after local edits (debounced) and pull on a timer / on focus. */
export function startCloudSync() {
  if (started) return () => {};
  started = true;

  const schedule = () => {
    if (!useCloud.getState().account || applying) return;
    const { tasks, lists } = useApp.getState();
    if (signature(tasks, lists) === lastSignature) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      void useCloud.getState().sync();
    }, 2500);
  };

  const unsubscribe = useApp.subscribe(schedule);
  const interval = window.setInterval(() => {
    if (useCloud.getState().account && document.visibilityState === "visible") {
      void useCloud.getState().sync();
    }
  }, 60_000);
  const onOnline = () => void useCloud.getState().sync();
  const onFocus = () => void useCloud.getState().sync();
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onFocus);

  void useCloud.getState().hydrate();

  return () => {
    started = false;
    unsubscribe();
    window.clearInterval(interval);
    window.clearTimeout(timer);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
  };
}
