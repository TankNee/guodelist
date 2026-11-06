export type Priority = "none" | "low" | "medium" | "high" | "urgent";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Absolute path on disk (Tauri). */
  path?: string;
  /** Inline payload used by the browser build. */
  dataUrl?: string;
}

export type RecurrenceFreq = "daily" | "weekdays" | "weekly" | "monthly";

export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number;
  /** 0 = Sunday … 6 = Saturday; only for weekly. */
  weekdays?: number[];
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  listId: string;
  done: boolean;
  completedAt: string | null;
  dueDate: string | null; // yyyy-MM-dd
  dueTime: string | null; // HH:mm — the start of the block
  endTime: string | null; // HH:mm — optional end; defaults to +1h in views
  archived?: boolean;
  reminderMinutes?: number | null; // minutes before the start; null = none
  notifiedAt?: string | null; // dedupe key of the last fired reminder
  priority: Priority;
  labels: string[];
  subtasks: Subtask[];
  attachments: Attachment[];
  recurrence: Recurrence | null;
  createdAt: string;
  updatedAt?: string;
  order: number;
}

export interface TaskList {
  id: string;
  name: string;
  emoji: string;
  groupId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListGroup {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  body: string;
  createdAt: string;
}

export type ViewKind = "today" | "inbox" | "all" | "completed" | "list" | "calendar";

export interface View {
  kind: ViewKind;
  listId?: string;
}

export type Filter = "open" | "done";

export type ThemeMode = "light" | "dark" | "system";
export type ThemePack = "classic" | "starry";
export type Language = "zh" | "en";

export type WidgetSize = "compact" | "standard" | "fill";

export interface Settings {
  theme: ThemeMode;
  themePack: ThemePack;
  language: Language;
  zoom: number;
  sidebarWidth: number;
  detailWidth: number;
  /** Keeps a small "today" board pinned to the desktop. */
  widgetEnabled: boolean;
  /** Read-only board: view everything, change nothing. */
  widgetLocked: boolean;
  widgetSize: WidgetSize;
  /** 0.3 – 1: how much of the wallpaper shows through the board. */
  widgetOpacity: number;
  /** Desktop notifications for upcoming tasks. */
  notificationsEnabled: boolean;
  /** Default lead time in minutes when a task has a time. */
  defaultReminder: number;
}

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "none", label: "无优先级", color: "var(--ink-3)" },
  { value: "low", label: "低", color: "#4f7259" },
  { value: "medium", label: "中", color: "#8a5f14" },
  { value: "high", label: "高", color: "#a8411f" },
  { value: "urgent", label: "紧急", color: "#a82a1a" },
];

export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
