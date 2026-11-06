import type { Task } from "@/types";

export const DEFAULT_DURATION = 60; // minutes

export function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Start/end in minutes from midnight; falls back to a one hour block. */
export function taskRange(task: Task): { start: number; end: number } | null {
  const start = toMinutes(task.dueTime);
  if (start === null) return null;
  const explicitEnd = toMinutes(task.endTime);
  const end = explicitEnd !== null && explicitEnd > start ? explicitEnd : start + DEFAULT_DURATION;
  return { start, end: Math.min(end, 24 * 60) };
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

export function formatRange(task: Task): string {
  const range = taskRange(task);
  if (!range) return "";
  const end = task.endTime ? task.endTime : fromMinutes(range.end);
  return `${task.dueTime} – ${end}`;
}

export interface Block {
  task: Task;
  start: number;
  end: number;
  col: number;
  cols: number;
}

/**
 * Lays timed tasks into side-by-side columns when they overlap, the way a
 * calendar does. Returns blocks in start order.
 */
export function layoutBlocks(tasks: Task[]): Block[] {
  const items: Block[] = [];
  for (const task of tasks) {
    const range = taskRange(task);
    if (range) items.push({ task, start: range.start, end: range.end, col: 0, cols: 1 });
  }
  items.sort((a, b) => a.start - b.start || a.end - b.end);

  const result: Block[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columns: Block[][] = [];
    for (const item of cluster) {
      let placed = false;
      for (const column of columns) {
        const last = column[column.length - 1];
        if (item.start >= last.end) {
          column.push(item);
          item.col = columns.indexOf(column);
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.col = columns.length;
        columns.push([item]);
      }
    }
    for (const item of cluster) {
      item.cols = columns.length;
      result.push(item);
    }
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();

  return result;
}
