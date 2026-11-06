import { useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { cn } from "@/lib/utils";

const markdownOf = (editor: Editor) =>
  (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-6 place-items-center rounded text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10",
        active && "bg-black/[0.06] text-ink dark:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  const active = editor.isActive("link");
  return (
    <ToolButton
      label="链接"
      active={active}
      onClick={() => {
        if (active) {
          editor.chain().focus().unsetLink().run();
          return;
        }
        const url = window.prompt("链接地址", "https://");
        if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }}
    >
      <Link2 size={13.5} />
    </ToolButton>
  );
}

export function RichText({
  value,
  onChange,
  placeholder = "补充背景、链接、报价……任何之后会用到的东西。",
  editable = true,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, tightLists: true, linkify: true, breaks: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-text focus:outline-none",
        "aria-label": "任务备注",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(markdownOf(e));
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  // External resets (task switch, demo reset) come through as a new value.
  // Comparing trimmed markdown keeps our own typing from re-setting content.
  useEffect(() => {
    if (!editor) return;
    const current = markdownOf(editor).trim();
    if (value.trim() !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="h-24" />;

  return (
    <div
      className={cn(
        "-mx-2 cursor-text rounded-lg px-2 py-1.5 transition-colors duration-150",
        focused
          ? "bg-black/[0.03] ring-1 ring-line/70 dark:bg-white/[0.045] dark:ring-white/10"
          : "ring-1 ring-transparent hover:bg-black/[0.015] dark:hover:bg-white/[0.025]"
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center gap-0.5 transition-opacity duration-150",
          focused ? "opacity-100" : "opacity-0"
        )}
      >
        <ToolButton
          label="加粗"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={13.5} />
        </ToolButton>
        <ToolButton
          label="斜体"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={13.5} />
        </ToolButton>
        <ToolButton
          label="删除线"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={13.5} />
        </ToolButton>
        <span className="mx-1 h-3.5 w-px bg-line" />
        <ToolButton
          label="无序列表"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={13.5} />
        </ToolButton>
        <ToolButton
          label="有序列表"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={13.5} />
        </ToolButton>
        <ToolButton
          label="待办列表"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks size={13.5} />
        </ToolButton>
        <ToolButton
          label="引用"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={13.5} />
        </ToolButton>
        <ToolButton
          label="行内代码"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={13.5} />
        </ToolButton>
        <LinkButton editor={editor} />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
