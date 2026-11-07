import { cn } from "@/lib/utils";

export function TaskCheck({
  checked,
  onChange,
  size = 17,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  size?: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      aria-label={checked ? "标记为未完成" : "标记为已完成"}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onChange();
      }}
      style={{ width: size, height: size }}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-[1.5px] transition-all duration-200 ease-out",
        checked
          ? "border-brand bg-brand text-white"
          : "border-line-strong bg-transparent hover:border-ink-3 hover:bg-black/[0.03] dark:hover:bg-white/5",
        disabled && "cursor-default opacity-60 hover:border-line-strong hover:bg-transparent",
        className
      )}
    >
      <svg
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden
        className={cn(
          "size-[9px] transition-all duration-200 ease-out",
          checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
        )}
      >
        <path
          d="M2.2 6.3 4.7 8.7 9.8 3.6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
