import { useEffect, useState } from "react";
import { isMac, isTauri } from "@/lib/platform";
import appIcon from "@/assets/app-icon.png";
import { useApp } from "@/store/useApp";
import { StarBuddy } from "@/components/brand/StarBuddy";

type WinAction = "min" | "max" | "close";

async function windowAction(action: WinAction) {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  if (action === "min") await w.minimize();
  if (action === "max") await w.toggleMaximize();
  if (action === "close") await w.close();
}

function useMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      setMaximized(await win.isMaximized());
      unlisten = await win.onResized(async () => setMaximized(await win.isMaximized()));
    })();
    return () => unlisten?.();
  }, []);

  return maximized;
}

function MacControls() {
  return (
    <div className="no-drag flex items-center gap-2">
      <button
        type="button"
        aria-label="关闭窗口"
        onClick={() => windowAction("close")}
        className="group grid size-3 place-items-center rounded-full bg-[#f0635a] transition active:scale-95"
      >
        <span className="size-1.5 rounded-full bg-black/0 transition group-hover:bg-black/25" />
      </button>
      <button
        type="button"
        aria-label="最小化窗口"
        onClick={() => windowAction("min")}
        className="group grid size-3 place-items-center rounded-full bg-[#efbd4e] transition active:scale-95"
      >
        <span className="h-px w-1.5 bg-black/0 transition group-hover:bg-black/30" />
      </button>
      <button
        type="button"
        aria-label="最大化窗口"
        onClick={() => windowAction("max")}
        className="group grid size-3 place-items-center rounded-full bg-[#4fbe55] transition active:scale-95"
      >
        <span className="size-1.5 rounded-[1px] border border-black/0 transition group-hover:border-black/30" />
      </button>
    </div>
  );
}

function WindowsControls({ maximized }: { maximized: boolean }) {
  const base =
    "no-drag grid h-8 w-[46px] place-items-center text-ink-2 transition-colors hover:bg-black/[0.06] dark:hover:bg-white/10";
  return (
    <div className="flex items-center self-stretch">
      <button type="button" aria-label="最小化" onClick={() => windowAction("min")} className={base}>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button type="button" aria-label={maximized ? "还原" : "最大化"} onClick={() => windowAction("max")} className={base}>
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none">
            <path d="M2.5 2.5V0.5h7v7h-2" stroke="currentColor" strokeWidth="1" />
            <rect x="0.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none">
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        type="button"
        aria-label="关闭"
        onClick={() => windowAction("close")}
        className="no-drag grid h-8 w-[46px] place-items-center text-ink-2 transition-colors hover:bg-[#c42b1c] hover:text-white"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}

export function TitleBar() {
  const maximized = useMaximized();
  const mac = isMac();
  const pack = useApp((s) => s.settings.themePack);

  return (
    <div
      className="drag-region flex h-8 shrink-0 items-center"
      data-tauri-drag-region
      onDoubleClick={() => windowAction("max")}
    >
      {mac ? (
        <div className="pl-3">
          <MacControls />
        </div>
      ) : (
        <span className="size-3" />
      )}

      <div className="ml-2.5 flex items-center gap-2">
        {pack === "starry" ? (
          <StarBuddy size={18} className="text-[#F6C453]" />
        ) : (
          <img
            src={appIcon}
            alt=""
            width={18}
            height={18}
            className="rounded-[5px]"
            draggable={false}
          />
        )}
        <span className="text-[12.5px] font-semibold tracking-[-0.01em] text-ink">Guodelist</span>
      </div>

      <div className="h-full flex-1" data-tauri-drag-region />
      {!mac && <WindowsControls maximized={maximized} />}
    </div>
  );
}
