import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TitleBar } from "@/components/app/TitleBar";
import { Sidebar } from "@/components/app/Sidebar";
import { TaskListPanel } from "@/components/app/TaskListPanel";
import { CalendarPanel } from "@/components/app/CalendarPanel";
import { TaskDetail } from "@/components/app/TaskDetail";
import { CommandPalette } from "@/components/app/CommandPalette";
import { SettingsDialog } from "@/components/app/SettingsDialog";
import { Splitter } from "@/components/app/Splitter";
import { useApp } from "@/store/useApp";
import { visibleTasks } from "@/lib/select";
import { useTheme, useZoom } from "@/lib/theme";
import { useCrossWindowSync } from "@/lib/sync";
import { startCloudSync } from "@/lib/cloud";
import { useReminders } from "@/lib/reminders";
import { isTauri } from "@/lib/platform";
import { showWidget } from "@/lib/widget";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useTheme();
  useZoom();
  useCrossWindowSync();
  useReminders();

  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const view = useApp((s) => s.view);
  const detailOpen = useApp((s) => s.detailOpen);

  useEffect(() => {
    if (useApp.getState().settings.widgetEnabled) {
      void showWidget();
    }
  }, []);

  useEffect(() => startCloudSync(), []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen("tray-quick-add", () => {
          const el = document.querySelector<HTMLInputElement>("[data-quick-add] input");
          el?.focus();
          el?.select();
        })
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => unlisten?.();
  }, []);

  const focusQuickAdd = () => {
    const el = document.querySelector<HTMLInputElement>("[data-quick-add] input");
    el?.focus();
    el?.select();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      if (mod && e.key === ",") {
        e.preventDefault();
        useApp.getState().openSettings();
        return;
      }

      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        focusQuickAdd();
        return;
      }

      if (mod && e.key === "Enter") {
        const id = useApp.getState().selectedTaskId;
        if (id) {
          e.preventDefault();
          useApp.getState().toggleTask(id);
        }
        return;
      }

      if (e.key === "Escape" && !typing) {
        const s = useApp.getState();
        if (s.settingsOpen) return;
        if (s.detailOpen) s.closeDetail();
      }

      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !typing) {
        const s = useApp.getState();
        const rows = visibleTasks(s.tasks, s.view, s.filter, s.dayKey);
        if (!rows.length) return;
        e.preventDefault();
        const idx = rows.findIndex((t) => t.id === s.selectedTaskId);
        const next =
          e.key === "ArrowDown"
            ? rows[Math.min(rows.length - 1, idx + 1)]
            : rows[Math.max(0, idx - 1)];
        if (next) s.selectTask(next.id);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className="flex flex-col overflow-hidden bg-app"
        style={{
          height: `calc(100vh / ${settings.zoom})`,
          width: `calc(100vw / ${settings.zoom})`,
        }}
      >
        <TitleBar />
        <div className="flex min-h-0 flex-1 px-2 pt-1 pb-2">
          <Sidebar width={settings.sidebarWidth} />

          <Splitter
            onDelta={(dx) =>
              setSettings({
                sidebarWidth: clamp(settings.sidebarWidth + dx / settings.zoom, 190, 340),
              })
            }
            onReset={() => setSettings({ sidebarWidth: 236 })}
          />

          {view.kind === "calendar" ? <CalendarPanel /> : <TaskListPanel />}

          {detailOpen && (
            <>
              <Splitter
                onDelta={(dx) =>
                  setSettings({
                    detailWidth: clamp(settings.detailWidth - dx / settings.zoom, 320, 620),
                  })
                }
                onReset={() => setSettings({ detailWidth: 404 })}
              />
              <TaskDetail width={settings.detailWidth} />
            </>
          )}
        </div>
      </div>
      <SettingsDialog />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onQuickAdd={focusQuickAdd}
      />
    </TooltipProvider>
  );
}
