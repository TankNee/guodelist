import { useRef } from "react";
import { cn } from "@/lib/utils";

export function Splitter({
  onDelta,
  onReset,
  className,
}: {
  onDelta: (delta: number) => void;
  onReset: () => void;
  className?: string;
}) {
  const dragging = useRef(false);
  const last = useRef(0);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={-1}
      onDoubleClick={onReset}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        last.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.style.cursor = "col-resize";
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const delta = e.clientX - last.current;
        last.current = e.clientX;
        onDelta(delta);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        document.body.style.cursor = "";
      }}
      onPointerCancel={() => {
        dragging.current = false;
        document.body.style.cursor = "";
      }}
      className={cn(
        "group relative z-10 w-2 shrink-0 cursor-col-resize touch-none",
        className
      )}
    >
      <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded bg-line opacity-0 transition group-hover:opacity-100" />
    </div>
  );
}
