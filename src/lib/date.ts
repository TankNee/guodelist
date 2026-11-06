import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { enUS, zhCN } from "date-fns/locale";

export const toKey = (d: Date) => format(d, "yyyy-MM-dd");
export const todayKey = () => toKey(new Date());

/** "周日" / "周一" … — zhCN's "E" token already includes 周, which caused 周周六. */
export const WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"];
export const weekdayCn = (d: Date) => WEEKDAY_CN[d.getDay()];

export const parseKey = (key: string) => startOfDay(parseISO(key));

export function formatDue(key: string | null, lang: "zh" | "en" = "zh"): string {
  if (!key) return "";
  const date = parseKey(key);
  if (!isValid(date)) return "";
  const diff = differenceInCalendarDays(date, startOfDay(new Date()));
  if (diff === 0) return lang === "zh" ? "今天" : "Today";
  if (diff === 1) return lang === "zh" ? "明天" : "Tomorrow";
  if (diff === -1) return lang === "zh" ? "昨天" : "Yesterday";
  if (diff > 1 && diff < 7) return format(date, "EEEE", { locale: lang === "zh" ? zhCN : enUS });
  if (date.getFullYear() === new Date().getFullYear()) {
    return format(date, lang === "zh" ? "M月d日" : "MMM d");
  }
  return format(date, lang === "zh" ? "yyyy年M月d日" : "MMM d, yyyy");
}

export function dueState(key: string | null): "none" | "overdue" | "today" | "soon" | "later" {
  if (!key) return "none";
  const diff = differenceInCalendarDays(parseKey(key), startOfDay(new Date()));
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 2) return "soon";
  return "later";
}

export function longDate(d: Date): string {
  return format(d, "M月d日 EEEE", { locale: zhCN });
}

export interface ParsedInput {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
}

const WEEKDAYS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  日: 0,
  天: 0,
};

const EN_WEEKDAYS: Record<string, number> = {
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  sunday: 0,
  sun: 0,
};

function nextWeekday(target: number): Date {
  const now = startOfDay(new Date());
  const delta = (target - now.getDay() + 7) % 7 || 7;
  return addDays(now, delta);
}

/**
 * Very small natural-language date reader for quick capture.
 * Understands the forms people actually type: 今天/明天/后天/周五/下周一/5月20日/today/next friday/3pm.
 * It never guesses: if nothing matches, the task simply has no date.
 */
export function parseInput(raw: string): ParsedInput {
  let text = ` ${raw} `;
  let dueDate: string | null = null;
  let dueTime: string | null = null;

  const take = (re: RegExp, handler: (m: RegExpMatchArray) => void) => {
    const m = text.match(re);
    if (m) {
      handler(m);
      text = text.replace(m[0], " ");
    }
  };

  // ---- relative days (zh) ----
  take(/(今天|今日)/, () => {
    dueDate = todayKey();
  });
  take(/(明天|明日)/, () => {
    dueDate = toKey(addDays(startOfDay(new Date()), 1));
  });
  take(/(后天)/, () => {
    dueDate = toKey(addDays(startOfDay(new Date()), 2));
  });

  // ---- weekdays (zh) ----
  take(/(下|这|本)?(?:周|星期|礼拜)([一二三四五六日天])/, (m) => {
    const target = WEEKDAYS[m[2]];
    let d = nextWeekday(target);
    if (m[1] === "下") d = addDays(d, 7);
    dueDate = toKey(d);
  });

  // ---- explicit dates (zh) ----
  take(/(\d{1,2})[月\/](\d{1,2})[日号]?/, (m) => {
    const year = new Date().getFullYear();
    const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
    if (d.getTime() < startOfDay(new Date()).getTime()) d.setFullYear(year + 1);
    dueDate = toKey(d);
  });

  // ---- english ----
  take(/\b(today)\b/i, () => {
    dueDate = todayKey();
  });
  take(/\b(tomorrow)\b/i, () => {
    dueDate = toKey(addDays(startOfDay(new Date()), 1));
  });
  take(/\b(next\s+)?(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thurs|friday|fri|saturday|sat|sunday|sun)\b/i, (m) => {
    let d = nextWeekday(EN_WEEKDAYS[m[2].toLowerCase()]);
    if (m[1]) d = addDays(d, 7);
    dueDate = toKey(d);
  });

  // ---- time ----
  take(/(上午|下午|晚上|中午|早上)?\s*(\d{1,2})\s*[:：点]\s*(\d{1,2})?\s*(?:分)?/, (m) => {
    let hour = Number(m[2]);
    const minute = m[3] ? Number(m[3]) : 0;
    if ((m[1] === "下午" || m[1] === "晚上") && hour < 12) hour += 12;
    if (hour > 23 || minute > 59) return;
    dueTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  });
  take(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
    let hour = Number(m[1]);
    const minute = m[2] ? Number(m[2]) : 0;
    if (m[3].toLowerCase() === "pm" && hour < 12) hour += 12;
    if (m[3].toLowerCase() === "am" && hour === 12) hour = 0;
    dueTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  });

  const title = text.replace(/\s+/g, " ").trim();
  return { title: title || raw.trim(), dueDate, dueTime };
}

export function formatDueWithTime(key: string | null, time: string | null, lang: "zh" | "en" = "zh"): string {
  const d = formatDue(key, lang);
  if (!d) return "";
  return time ? `${d} ${time}` : d;
}
