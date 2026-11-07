import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Inbox,
  ListTodo,
  Plus,
  Settings2,
} from "lucide-react";
import { useApp } from "@/store/useApp";
import { countOpen } from "@/lib/select";
import { todayKey } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TaskList, View } from "@/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const EMOJIS = [
  "📋", "📥", "🌴", "☀️", "🏠", "🛒", "🧹", "👕", "🥤", "🖨️",
  "💼", "🎯", "📚", "✈️", "🍜", "🎨", "🧪", "💡", "🌱", "🏃",
  "🎵", "🧾", "🔧", "❤️",
];

function NavItem({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-8 w-full items-center gap-2.5 rounded-[9px] pr-2 pl-3 text-left text-[13.5px] transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-ink"
          : "text-ink-2 hover:bg-black/[0.035] hover:text-ink dark:hover:bg-white/5"
      )}
    >
      {active && (
        <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand" />
      )}
      <span className={cn("grid w-4 shrink-0 place-items-center", active ? "opacity-100" : "opacity-80")}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      <span className="flex w-5 shrink-0 justify-center">
        {typeof count === "number" && count > 0 && (
          <span className="num text-[11.5px] font-normal text-ink-3 group-hover:text-ink-2">
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

function ListRow({
  list,
  active,
  count,
  onClick,
  onRename,
  onEmoji,
  onMove,
  onDuplicate,
  onDelete,
}: {
  list: TaskList;
  active: boolean;
  count: number;
  onClick: () => void;
  onRename: (name: string) => void;
  onEmoji: (emoji: string) => void;
  onMove: (groupId: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const groups = useApp((s) => s.groups);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(list.name);

  const commit = () => {
    const name = draft.trim();
    if (name && name !== list.name) onRename(name);
    else setDraft(list.name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="relative flex h-8 w-full items-center gap-2.5 rounded-[9px] bg-white/70 pr-2 pl-3 ring-1 ring-line dark:bg-white/10">
        <span className="w-4 shrink-0 text-center text-[13px] leading-none">{list.emoji}</span>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(list.name);
              setEditing(false);
            }
          }}
          className="w-full bg-transparent text-[13.5px] outline-none"
        />
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "group relative flex h-8 w-full items-center gap-2.5 rounded-[9px] pr-2 pl-3 text-left text-[13.5px] transition-colors",
            active
              ? "bg-sidebar-accent font-medium text-ink"
              : "text-ink-2 hover:bg-black/[0.035] hover:text-ink dark:hover:bg-white/5"
          )}
        >
          {active && (
            <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand" />
          )}
          <span className="w-4 shrink-0 text-center text-[13px] leading-none">{list.emoji}</span>
          <span className="flex-1 truncate">{list.name}</span>
          <span className="flex w-5 shrink-0 justify-center">
            {count > 0 && (
              <span className="num text-[11.5px] text-ink-3">{count}</span>
            )}
          </span>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-[188px]">
        <ContextMenuItem onClick={() => setEditing(true)}>重命名</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>更换图标</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-[236px] p-2">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onEmoji(e)}
                  className="grid size-6 place-items-center rounded text-[15px] transition hover:bg-panel-2"
                >
                  {e}
                </button>
              ))}
            </div>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>移动到</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-[168px]">
            {groups.map((g) => (
              <ContextMenuItem key={g.id} onClick={() => onMove(g.id)}>
                {g.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={onDuplicate}>复制清单</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="text-destructive">
          删除清单
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function Sidebar({ width }: { width: number }) {
  const tasks = useApp((s) => s.tasks);
  const lists = useApp((s) => s.lists);
  const groups = useApp((s) => s.groups);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const addList = useApp((s) => s.addList);
  const updateList = useApp((s) => s.updateList);
  const duplicateList = useApp((s) => s.duplicateList);
  const deleteList = useApp((s) => s.deleteList);
  const openSettings = useApp((s) => s.openSettings);

  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const counts = useMemo(() => {
    const today = countOpen(tasks, (t) => t.dueDate === todayKey());
    const inbox = countOpen(tasks, (t) => t.listId === "inbox");
    const byList = new Map<string, number>();
    for (const l of lists) byList.set(l.id, 0);
    for (const t of tasks) {
      if (!t.done && byList.has(t.listId)) {
        byList.set(t.listId, (byList.get(t.listId) ?? 0) + 1);
      }
    }
    return { today, inbox, byList };
  }, [tasks, lists]);

  const go = (v: View) => setView(v);
  const isListActive = (id: string) => view.kind === "list" && view.listId === id;
  const t = useT();
  const groupLabel = (id: string, fallback: string) =>
    id === "projects" ? t("nav.projects") : id === "home" ? t("nav.life") : fallback;

  const groupIds = new Set(groups.map((g) => g.id));
  const fallbackGroupId = groups[0]?.id ?? "projects";
  const sidebarLists = lists.map((list) =>
    list.id === "inbox" || (list.groupId && groupIds.has(list.groupId))
      ? list
      : { ...list, groupId: fallbackGroupId }
  );

  const submitList = (groupId: string) => {
    if (draft.trim()) addList(draft, groupId);
    setDraft("");
    setAdding(null);
  };

  return (
    <aside className="flex shrink-0 flex-col pt-1 pb-3" style={{ width }}>

      <nav className="flex flex-col gap-0.5">
        <NavItem
          active={view.kind === "today"}
          icon={<CalendarCheck2 size={15} className="text-brand" strokeWidth={1.9} />}
          label={t("nav.today")}
          count={counts.today}
          onClick={() => go({ kind: "today" })}
        />
        <NavItem
          active={view.kind === "calendar"}
          icon={<CalendarDays size={15} className="text-[#7a6bb0]" strokeWidth={1.9} />}
          label={t("nav.calendar")}
          onClick={() => go({ kind: "calendar" })}
        />
        <NavItem
          active={view.kind === "inbox"}
          icon={<Inbox size={15} className="text-[#c58a3d]" strokeWidth={1.9} />}
          label={t("nav.inbox")}
          count={counts.inbox}
          onClick={() => go({ kind: "inbox" })}
        />
        <NavItem
          active={view.kind === "all"}
          icon={<ListTodo size={15} className="text-ink-2" strokeWidth={1.9} />}
          label={t("nav.all")}
          onClick={() => go({ kind: "all" })}
        />
        <NavItem
          active={view.kind === "completed"}
          icon={<CheckCircle2 size={15} className="text-[#6f8f7a]" strokeWidth={1.9} />}
          label={t("nav.done")}
          onClick={() => go({ kind: "completed" })}
        />
      </nav>

      <div className="mt-5 flex-1 overflow-y-auto pr-0.5">
        {groups.map((group) => {
          const groupLists = sidebarLists.filter((l) => l.groupId === group.id && l.id !== "inbox");
          if (groupLists.length === 0 && adding !== group.id) return null;
          return (
            <div key={group.id} className="group mb-4">
              <div className="mb-1 flex h-6 items-center justify-between pr-2 pl-3">
                <span className="text-[11px] font-medium tracking-[0.06em] text-ink-3">
                  {groupLabel(group.id, group.name)}
                </span>
                <button
                  type="button"
                  aria-label={t("nav.newListIn", { name: groupLabel(group.id, group.name) })}
                  onClick={() => setAdding(group.id)}
                  className="grid size-5 place-items-center rounded-md text-ink-3 opacity-0 transition hover:bg-black/5 hover:text-ink group-hover:opacity-100"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {groupLists.map((l) => (
                  <ListRow
                    key={l.id}
                    list={l}
                    active={isListActive(l.id)}
                    count={counts.byList.get(l.id) ?? 0}
                    onClick={() => go({ kind: "list", listId: l.id })}
                    onRename={(name) => updateList(l.id, { name })}
                    onEmoji={(emoji) => updateList(l.id, { emoji })}
                    onMove={(groupId) => updateList(l.id, { groupId })}
                    onDuplicate={() => duplicateList(l.id)}
                    onDelete={() => deleteList(l.id)}
                  />
                ))}

                {adding === group.id && (
                  <div className="relative flex h-8 w-full items-center gap-2.5 rounded-[9px] bg-white/70 pr-2 pl-3 ring-1 ring-line dark:bg-white/10">
                    <span className="text-[13px]">📋</span>
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => submitList(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitList(group.id);
                        if (e.key === "Escape") {
                          setDraft("");
                          setAdding(null);
                        }
                      }}
                      placeholder={t("nav.listName")}
                      className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-ink-3"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-line/80 px-1 pt-2">
        <button
          type="button"
          onClick={() => setAdding(groups[0]?.id ?? "home")}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] text-ink-2 transition hover:bg-black/5 hover:text-ink"
        >
          <Plus size={14} />
          {t("nav.newList")}
        </button>
        <button
          type="button"
          aria-label="设置"
          onClick={openSettings}
          className="grid size-8 place-items-center rounded-full text-ink-3 transition hover:bg-black/5 hover:text-ink"
        >
          <Settings2 size={15} />
        </button>
      </div>
    </aside>
  );
}
