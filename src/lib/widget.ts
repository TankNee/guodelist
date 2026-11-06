import { isTauri } from "@/lib/platform";
import type { WidgetSize } from "@/types";

const invokeCmd = async (cmd: string, args?: Record<string, unknown>) => {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke(cmd, args);
};

/** Shows the desktop board, pinned above the wallpaper. */
export const showWidget = () => invokeCmd("show_widget");

export const hideWidget = () => invokeCmd("hide_widget");

export const openMainWindow = () => invokeCmd("show_main");

/** compact / standard / fill — resizes the board itself, never the main window. */
export const setWidgetSize = (mode: WidgetSize) => invokeCmd("widget_set_size", { mode });

export const canUseWidget = () => isTauri();
