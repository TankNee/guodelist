import { useEffect, useRef, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowUp, Lock, Paperclip, Plus, Trash2, X } from "lucide-react";
import type { Task } from "@/types";
import { useApp } from "@/store/useApp";
import { useT, useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatBytes, openAttachment, pickAttachment } from "@/lib/attachments";
import { Button } from "@/components/ui/button";
import { TaskCheck } from "./TaskCheck";
import { DueChip, LabelChip, ListChip, PriorityChip, RecurrenceChip, ReminderChip } from "./DetailChips";
import { RichText } from "./RichText";

function relative(iso: string) {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: zhCN });
  } catch {
    return "";
  }
}

function DetailBody({ task }: { task: Task }) {
  const lists = useApp((s) => s.lists);
  const t = useT();
  const lang = useLang();
  const comments = useApp((s) => s.comments);
  const updateTask = useApp((s) => s.updateTask);
  const toggleTask = useApp((s) => s.toggleTask);
  const deleteTask = useApp((s) => s.deleteTask);
  const closeDetail = useApp((s) => s.closeDetail);
  const addSubtask = useApp((s) => s.addSubtask);
  const toggleSubtask = useApp((s) => s.toggleSubtask);
  const removeSubtask = useApp((s) => s.removeSubtask);
  const addComment = useApp((s) => s.addComment);
  const addAttachment = useApp((s) => s.addAttachment);
  const removeAttachment = useApp((s) => s.removeAttachment);

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [sub, setSub] = useState("");
  const [message, setMessage] = useState("");
  const [addingFile, setAddingFile] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes);
  }, [task.id, task.title, task.notes]);

  useEffect(() => {
    return () => window.clearTimeout(saveTimer.current);
  }, []);

  const queueNotesSave = (markdown: string) => {
    setNotes(markdown);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateTask(task.id, { notes: markdown });
    }, 400);
  };

  const attach = async () => {
    setAddingFile(true);
    try {
      const file = await pickAttachment();
      if (file) addAttachment(task.id, file);
    } finally {
      setAddingFile(false);
    }
  };

  const taskComments = comments.filter((c) => c.taskId === task.id);
  const doneSubs = task.subtasks.filter((s) => s.done).length;

  return (
    <>
      <div className="shrink-0 bg-panel-2 px-5 pt-3.5 pb-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
            {t("task.detail")}
          </span>
          <button
            type="button"
            aria-label="关闭详情"
            onClick={closeDetail}
            className="grid size-7 place-items-center rounded-full text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="pt-[5px]">
            <TaskCheck checked={task.done} onChange={() => toggleTask(task.id)} size={18} />
          </div>
          <textarea
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== task.title) updateTask(task.id, { title: title.trim() });
              if (!title.trim()) setTitle(task.title);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className={cn(
              "field-sizing-content w-full resize-none bg-transparent text-[21px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink outline-none",
              task.done && "text-ink-3 line-through decoration-ink-3/50"
            )}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 pl-[30px]">
          <ListChip task={task} lists={lists} />
          <DueChip task={task} />
          <ReminderChip task={task} />
          <PriorityChip task={task} />
          <RecurrenceChip task={task} />
          <LabelChip task={task} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <section>
          <h2 className="mb-2 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
            {t("task.notes")}
          </h2>
          <RichText key={task.id} value={notes} onChange={queueNotesSave} />
        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">{t("task.subtasks")}</h2>
            {task.subtasks.length > 0 && (
              <span className="num text-[11px] text-ink-3">
                {doneSubs}/{task.subtasks.length}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {task.subtasks.map((st) => (
              <div
                key={st.id}
                className="group flex items-center gap-2.5 rounded-md py-1 pr-1 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <TaskCheck checked={st.done} onChange={() => toggleSubtask(task.id, st.id)} size={15} />
                <span
                  className={cn(
                    "flex-1 text-[13.5px] leading-snug",
                    st.done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink-2"
                  )}
                >
                  {st.title}
                </span>
                <button
                  type="button"
                  aria-label={t("task.delete")}
                  onClick={() => removeSubtask(task.id, st.id)}
                  className="grid size-6 place-items-center rounded text-ink-3 opacity-0 transition hover:bg-black/5 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-1 flex items-center gap-2.5">
            <span className="grid size-[15px] place-items-center rounded-full border border-dashed border-line-strong text-ink-3">
              <Plus size={8} />
            </span>
            <input
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sub.trim()) {
                  addSubtask(task.id, sub);
                  setSub("");
                }
              }}
              placeholder={t("task.addSubtask")}
              className="w-full bg-transparent py-1 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">{t("task.attachments")}</h2>
            <button
              type="button"
              onClick={attach}
              disabled={addingFile}
              className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] text-ink-3 transition hover:bg-black/5 hover:text-ink disabled:opacity-50"
            >
              <Plus size={12} />
              {t("task.addFile")}
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            {task.attachments.map((a) => (
              <div
                key={a.id}
                className="group flex items-center gap-2 rounded-md py-1 pr-1 transition hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <Paperclip size={13} className="shrink-0 text-ink-3" />
                <button
                  type="button"
                  onClick={() => openAttachment(a)}
                  className="min-w-0 flex-1 truncate text-left text-[13px] text-ink-2 hover:text-ink hover:underline"
                >
                  {a.name}
                </button>
                <span className="num shrink-0 text-[11px] text-ink-3">{formatBytes(a.size)}</span>
                <button
                  type="button"
                  aria-label={t("task.delete")}
                  onClick={() => removeAttachment(task.id, a.id)}
                  className="grid size-6 place-items-center rounded text-ink-3 opacity-0 transition hover:bg-black/5 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {task.attachments.length === 0 && (
              <p className="text-[12.5px] text-ink-3">{t("task.attachmentsHint")}</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">{t("task.comments")}</h2>

          <div className="flex flex-col gap-3">
            {taskComments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <span className="mt-[1px] grid size-6 shrink-0 place-items-center rounded-full bg-panel-2 text-[10.5px] font-semibold text-ink-2">
                  {c.author.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px] font-medium text-ink">{c.author}</span>
                    <span className="text-[11px] text-ink-3">{relative(c.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{c.body}</p>
                </div>
              </div>
            ))}
            {taskComments.length === 0 && (
              <p className="text-[12.5px] text-ink-3">{t("task.noComments")}</p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 focus-within:border-line-strong">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  addComment(task.id, message);
                  setMessage("");
                }
              }}
              placeholder={t("task.commentPlaceholder")}
              className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
            <button
              type="button"
              aria-label={lang === "zh" ? "发送评论" : "Send comment"}
              disabled={!message.trim()}
              onClick={() => {
                addComment(task.id, message);
                setMessage("");
              }}
              className="grid size-6 place-items-center rounded-full bg-ink text-panel transition disabled:bg-line-strong disabled:text-ink-3"
            >
              <ArrowUp size={12} strokeWidth={2.6} />
            </button>
          </div>
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-line px-5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <Lock size={11} />
          {t("task.private")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteTask(task.id)}
          className="h-7 gap-1.5 px-2 text-[12px] text-ink-3 hover:text-destructive"
        >
          <Trash2 size={12.5} />
          {t("task.delete")}
        </Button>
      </div>
    </>
  );
}

export function TaskDetail({ width }: { width: number }) {
  const detailOpen = useApp((s) => s.detailOpen);
  const task = useApp((s) => s.tasks.find((t) => t.id === s.selectedTaskId));

  if (!detailOpen) return null;

  return (
    <aside
      className="panel-in flex shrink-0 flex-col overflow-hidden rounded-[16px] border border-line/80 bg-panel panel-shadow"
      style={{ width }}
    >
      {task ? (
        <DetailBody key={task.id} task={task} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-[13.5px] font-medium text-ink-2">
            {useApp.getState().settings.language === "zh" ? "没有选中的任务" : "No task selected"}
          </p>
          <p className="max-w-[220px] text-[12px] leading-relaxed text-ink-3">
            {useApp.getState().settings.language === "zh"
              ? "在左侧点开一条任务，备注、子任务和附件都会出现在这里。"
              : "Pick a task on the left; notes, subtasks and attachments show up here."}
          </p>
          <button
            type="button"
            onClick={() => useApp.getState().closeDetail()}
            className="mt-2 text-[12px] font-medium text-brand-ink"
          >
            收起面板
          </button>
        </div>
      )}
    </aside>
  );
}
