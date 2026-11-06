import type { Attachment } from "@/types";
import { isTauri } from "@/lib/platform";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const MAX_BROWSER_BYTES = 2 * 1024 * 1024;

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Picks a file and copies it into the app data directory (Tauri) or inlines it (browser). */
export async function pickAttachment(): Promise<Attachment | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");

    const selected = await open({ multiple: false, directory: false });
    if (!selected || Array.isArray(selected)) return null;
    const source = selected as string;

    const info = await invoke<{ path: string; size: number }>("copy_attachment", { src: source });
    const name = source.split(/[\\/]/).pop() ?? "附件";

    return { id: uid(), name, size: info.size, mime: extOf(name), path: info.path };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > MAX_BROWSER_BYTES) {
        window.alert("浏览器预览模式只支持 2MB 以内的附件；桌面版没有这个限制。");
        return resolve(null);
      }
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result));
        reader.readAsDataURL(file);
      });
      resolve({ id: uid(), name: file.name, size: file.size, mime: file.type, dataUrl });
    };
    input.click();
  });
}

export async function openAttachment(attachment: Attachment) {
  if (attachment.path && isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_attachment", { path: attachment.path });
    return;
  }
  if (attachment.dataUrl) {
    window.open(attachment.dataUrl, "_blank");
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
