export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export const isWindows = () =>
  typeof navigator !== "undefined" && /Win/.test(navigator.platform || navigator.userAgent);

export const APP_VERSION = "0.9.8";

