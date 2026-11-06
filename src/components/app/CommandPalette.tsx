import { useMemo } from "react";
import { CalendarCheck2, CheckCircle2, Inbox, ListTodo, Plus } from "lucide-react";
import { useApp } from "@/store/useApp";
import { useT } from "@/lib/i18n";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandPalette({
  open,
  onOpenChange,
  onQuickAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickAdd: () => void;
}) {
  const tasks = useApp((s) => s.tasks);
  const t = useT();
  const lists = useApp((s) => s.lists);
  const setView = useApp((s) => s.setView);
  const selectTask = useApp((s) => s.selectTask);

  const recent = useMemo(() => tasks.filter((t) => !t.done).slice(0, 8), [tasks]);

  const run = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="命令面板"
      description="搜索任务、清单，或跳转到某个视图"
      className="top-[16%] w-[560px] max-w-[92vw] translate-y-0 gap-0 rounded-2xl! border border-line p-0 shadow-2xl sm:max-w-[560px]"
    >
      <Command className="rounded-none bg-transparent p-0">
        <CommandInput placeholder={t("cmd.placeholder")} className="text-[14px]" />
      <CommandList className="max-h-[380px] p-1">
        <CommandEmpty className="py-8 text-[13px] text-ink-3">没有找到相关内容</CommandEmpty>

        <CommandGroup heading="视图">
          <CommandItem
            value="今天 today"
            onSelect={() => run(() => setView({ kind: "today" }))}
            className="gap-2.5 text-[13.5px]"
          >
            <CalendarCheck2 size={14} className="text-brand" />
            今天
          </CommandItem>
          <CommandItem
            value="收件箱 inbox"
            onSelect={() => run(() => setView({ kind: "inbox" }))}
            className="gap-2.5 text-[13.5px]"
          >
            <Inbox size={14} className="text-[#c58a3d]" />
            收件箱
          </CommandItem>
          <CommandItem
            value="全部任务 all"
            onSelect={() => run(() => setView({ kind: "all" }))}
            className="gap-2.5 text-[13.5px]"
          >
            <ListTodo size={14} className="text-ink-2" />
            {t("nav.all")}
          </CommandItem>
          <CommandItem
            value="已完成 completed"
            onSelect={() => run(() => setView({ kind: "completed" }))}
            className="gap-2.5 text-[13.5px]"
          >
            <CheckCircle2 size={14} className="text-[#6f8f7a]" />
            已完成
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="清单">
          {lists.map((l) => (
            <CommandItem
              key={l.id}
              value={`${l.name} ${l.id}`}
              onSelect={() => run(() => setView({ kind: "list", listId: l.id }))}
              className="gap-2.5 text-[13.5px]"
            >
              <span>{l.emoji}</span>
              {l.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="任务">
          {recent.map((t) => (
            <CommandItem
              key={t.id}
              value={`${t.title} ${t.id}`}
              onSelect={() =>
                run(() => {
                  setView({ kind: "list", listId: t.listId });
                  selectTask(t.id);
                })
              }
              className="gap-2.5 text-[13.5px]"
            >
              <span className="size-1.5 rounded-full bg-line-strong" />
              <span className="flex-1 truncate">{t.title}</span>
              <span className="text-[11px] text-ink-3">
                {lists.find((l) => l.id === t.listId)?.name}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("cmd.actions")}>
          <CommandItem
            value={t("cmd.newTask") + " new task"}
            onSelect={() => run(onQuickAdd)}
            className="gap-2.5 text-[13.5px]"
          >
            <Plus size={14} />
            {t("cmd.newTask")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
