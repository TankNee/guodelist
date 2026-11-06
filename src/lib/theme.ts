import { useEffect, useState } from "react";
import type { ThemeMode } from "@/types";
import { useApp } from "@/store/useApp";

function resolve(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

/** The palette that is actually on screen right now. */
export function useResolvedTheme(): "light" | "dark" {
  const theme = useApp((s) => s.settings.theme);
  const [mode, setMode] = useState<"light" | "dark">(() => resolve(theme));

  useEffect(() => {
    setMode(resolve(theme));
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setMode(resolve("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return mode;
}

function apply(theme: ThemeMode) {
  const mode = resolve(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/** Keeps the <html> class in sync with the stored theme, including OS changes. */
export function useTheme() {
  const theme = useApp((s) => s.settings.theme);
  const pack = useApp((s) => s.settings.themePack);
  const language = useApp((s) => s.settings.language);

  useEffect(() => {
    document.documentElement.dataset.pack = pack;
  }, [pack]);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  useEffect(() => {
    apply(theme);

    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
}

/** Applies the user's zoom level to the whole window. */
export function useZoom() {
  const zoom = useApp((s) => s.settings.zoom);
  useEffect(() => {
    document.documentElement.style.zoom = String(zoom);
  }, [zoom]);
}
