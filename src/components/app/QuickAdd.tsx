import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useApp } from "@/store/useApp";
import { formatDueWithTime, parseInput } from "@/lib/date";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function QuickAdd({
  listId,
  defaultDue,
  inputRef,
}: {
  listId?: string;
  defaultDue?: string | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const addTask = useApp((s) => s.addTask);
  const t = useT();
  const lang = useLang();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const parsed = useMemo(() => parseInput(value), [value]);
  const dueDate = parsed.dueDate ?? defaultDue ?? null;
  const preview = formatDueWithTime(dueDate, parsed.dueTime);
  const showPreview = focused && value.trim().length > 0 && preview.length > 0;

  const submit = () => {
    if (!value.trim()) return;
    addTask({
      title: parsed.title,
      listId,
      dueDate,
      dueTime: parsed.dueTime,
    });
    setValue("");
  };

  return (
    <div
      data-quick-add
      className={cn(
        "-mx-3 flex items-start gap-3 rounded-[11px] px-3 py-[9px] transition-colors",
        focused
          ? "bg-black/[0.025] dark:bg-white/[0.04]"
          : "hover:bg-black/[0.028] dark:hover:bg-white/[0.035]"
      )}
    >
      <span className="mt-[2px] grid size-[17px] shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-line-strong text-ink-3">
        <Plus size={10} strokeWidth={2.4} />
      </span>

      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") {
              setValue("");
              e.currentTarget.blur();
            }
          }}
          placeholder={t("list.quickAdd")}
          className="w-full bg-transparent text-[14.5px] leading-[1.35] font-medium tracking-[-0.006em] text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
        />
        {showPreview && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-[3px] text-[11px] font-medium text-brand-ink">
              <CalendarDays size={11} strokeWidth={2.2} />
              {preview}
            </span>
            <span className="text-[11px] text-ink-3">{lang === "zh" ? "回车创建" : "Enter to add"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
