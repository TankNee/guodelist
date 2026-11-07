import { useState } from "react";
import {
  AppWindow,
  Database,
  Download,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useApp } from "@/store/useApp";
import { APP_VERSION, isTauri } from "@/lib/platform";
import { defaultSettings } from "@/store/useApp";
import { hideWidget, showWidget } from "@/lib/widget";
import { StarBuddy } from "@/components/brand/StarBuddy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCloud } from "@/lib/cloud";
import { API_BASE } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/reminders";
import {
  checkDesktopUpdate,
  installDesktopUpdate,
  type DesktopUpdate,
} from "@/lib/updater";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const THEMES = [
  { value: "light", label: "settings.themeLight", icon: Sun },
  { value: "dark", label: "settings.themeDark", icon: Moon },
  { value: "system", label: "settings.themeSystem", icon: Monitor },
] as const;

const ZOOMS = [0.9, 1, 1.1, 1.2];

const PACKS = [
  {
    id: "classic" as const,
    label: "settings.packClassic" as const,
    desc: "settings.packClassicDesc" as const,
    swatches: ["#EBE8E3", "#FFFEFC", "#E1543A"],
  },
  {
    id: "starry" as const,
    label: "settings.packStarry" as const,
    desc: "settings.packStarryDesc" as const,
    swatches: ["#FFF5E6", "#FFE0E9", "#F6C453"],
  },
];

type Tab = "general" | "appearance" | "account" | "data";

function Field({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-ink">{title}</p>
        {hint && <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{action ?? children}</div>
    </div>
  );
}

function AccountPanel() {
  const { account, status, error, lastSync, login, register, logout, sync } = useCloud();
  const t = useT();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async () => {
    setBusy(true);
    setFormError("");
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim() || email.split("@")[0]);
      setPassword("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setBusy(false);
    }
  };

  if (account) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{account.name}</p>
            <p className="truncate text-[11.5px] text-ink-3">{account.email}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void sync()}
              disabled={status === "syncing"}
              className="h-7 gap-1 px-2 text-[11.5px] text-ink-2"
            >
              <RefreshCw size={12} className={status === "syncing" ? "animate-spin" : ""} />
              {t("account.syncNow")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-7 gap-1 px-2 text-[11.5px] text-ink-3"
            >
              <LogOut size={12} />
              {t("account.logout")}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-3">
          {status === "syncing" && t("account.syncing")}
          {status === "ok" &&
            t("account.synced", {
              time: lastSync
                ? new Date(lastSync).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                : "",
            })}
          {status === "error" && t("account.syncError", { msg: error })}
          {status === "idle" && "…"}
        </p>
        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">{t("account.syncHint")}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11.5px] leading-relaxed text-ink-3">{t("account.loginHint")}</p>
      <div className="mt-3 grid gap-2">
        <Input
          type="email"
          placeholder={t("account.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-8 text-[12.5px]"
        />
        <Input
          type="password"
          placeholder={t("account.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-8 text-[12.5px]"
        />
        {mode === "register" && (
          <Input
            placeholder={t("account.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-[12.5px]"
          />
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={busy || !email || password.length < 8}
          className="h-7 px-3 text-[11.5px]"
        >
          {mode === "login" ? t("account.login") : t("account.register")}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setFormError("");
          }}
          className="text-[11.5px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
        >
          {mode === "login" ? t("account.toRegister") : t("account.toLogin")}
        </button>
      </div>
      {formError && <p className="mt-2 text-[11.5px] text-[#b3261e]">{formError}</p>}
      <p className="mt-3 text-[10.5px] text-ink-3">{API_BASE}</p>
    </div>
  );
}

export function SettingsDialog() {
  const open = useApp((s) => s.settingsOpen);
  const close = useApp((s) => s.closeSettings);
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const resetDemo = useApp((s) => s.resetDemo);
  const restoreArchived = useApp((s) => s.restoreArchived);
  const tasks = useApp((s) => s.tasks);
  const lists = useApp((s) => s.lists);
  const comments = useApp((s) => s.comments);
  const account = useCloud((s) => s.account);
  const t = useT();
  const [tab, setTab] = useState<Tab>("general");
  const [update, setUpdate] = useState<DesktopUpdate | null>(null);
  const [updateState, setUpdateState] = useState<
    "idle" | "checking" | "available" | "latest" | "installing" | "error"
  >("idle");
  const [updateError, setUpdateError] = useState("");

  const checkUpdate = async () => {
    setUpdateState("checking");
    setUpdateError("");
    try {
      const found = await checkDesktopUpdate();
      setUpdate(found);
      setUpdateState(found ? "available" : "latest");
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "检查更新失败");
      setUpdateState("error");
    }
  };

  const installUpdate = async () => {
    if (!update) return;
    setUpdateState("installing");
    setUpdateError("");
    try {
      await installDesktopUpdate(update);
      if (!isTauri()) setUpdateState("latest");
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "安装更新失败");
      setUpdateState("error");
    }
  };

  const exportJson = async () => {    const payload = JSON.stringify(
      { version: APP_VERSION, exportedAt: new Date().toISOString(), lists, tasks, comments },
      null,
      2
    );
    const name = `guodelist-${new Date().toISOString().slice(0, 10)}.json`;

    if (isTauri()) {
      const [{ save }, { invoke }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/api/core"),
      ]);
      const path = await save({ defaultPath: name, filters: [{ name: "JSON", extensions: ["json"] }] });
      if (path) await invoke("write_text_file", { path, contents: payload });
      return;
    }

    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: Tab; label: string; icon: typeof Settings2 }[] = [
    { id: "general", label: t("settings.general"), icon: Settings2 },
    { id: "appearance", label: t("settings.appearance"), icon: Palette },
    { id: "account", label: t("settings.account"), icon: UserRound },
    { id: "data", label: t("settings.data"), icon: Database },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[760px] max-w-[94vw] gap-0 overflow-hidden rounded-2xl border-line p-0 sm:max-w-[760px]"
      >
        <div className="flex h-[520px] max-h-[80vh]">
          <aside className="flex w-[176px] shrink-0 flex-col border-r border-line bg-panel-2/50 px-2.5 py-4">
            <DialogHeader className="mb-3 flex flex-row items-center justify-between gap-2 px-2">
              <DialogTitle className="text-[13.5px] font-semibold">{t("settings.title")}</DialogTitle>
              <DialogDescription className="sr-only">{t("settings.title")}</DialogDescription>
              <button
                type="button"
                aria-label={t("settings.close")}
                onClick={close}
                className="grid size-6 place-items-center rounded-md text-ink-3 transition hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </DialogHeader>
            <nav className="flex flex-col gap-0.5">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-lg px-2.5 text-left text-[12.5px] transition",
                      active
                        ? "bg-panel font-medium text-ink shadow-[0_1px_2px_rgba(28,26,23,0.06)]"
                        : "text-ink-3 hover:bg-black/[0.04] hover:text-ink-2"
                    )}
                  >
                    <Icon size={13.5} className={active ? "text-brand" : "text-ink-3"} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto px-2 text-[10.5px] text-ink-3">
              v{APP_VERSION}
              <br />
              {account ? account.email : t("settings.notLoggedIn")}
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4">
            {tab === "general" && (
              <div className="divide-y divide-line">
                <Field
                  title={t("settings.widget")}
                  hint={t("settings.widgetHint")}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.widgetEnabled}
                    aria-label="桌面小组件"
                    disabled={!isTauri()}
                    onClick={async () => {
                      const next = !settings.widgetEnabled;
                      setSettings({ widgetEnabled: next });
                      if (!isTauri()) return;
                      if (next) await showWidget();
                      else await hideWidget();
                    }}
                    className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                      settings.widgetEnabled ? "bg-brand" : "bg-line-strong",
                      !isTauri() && "opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-200",
                        settings.widgetEnabled ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                </Field>

                <Field
                  title={t("settings.opacity")}
                  hint={isTauri() ? t("settings.opacityHint") : t("settings.opacityHint")}
                  action={
                    <span className="num text-[12px] text-ink-2">
                      {Math.round(settings.widgetOpacity * 100)}%
                    </span>
                  }
                />
                <div className="-mt-2 pb-3">
                  <input
                    type="range"
                    min={30}
                    max={100}
                    step={5}
                    value={Math.round(settings.widgetOpacity * 100)}
                    onChange={(e) => setSettings({ widgetOpacity: Number(e.target.value) / 100 })}
                    aria-label="画板透明度"
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-[var(--brand)]"
                  />
                </div>

                <Field
                  title={t("settings.layout")}
                  hint={t("settings.layoutHint", {
                    s: Math.round(settings.sidebarWidth),
                    d: Math.round(settings.detailWidth),
                  })}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSettings({
                          sidebarWidth: defaultSettings.sidebarWidth,
                          detailWidth: defaultSettings.detailWidth,
                        })
                      }
                      className="h-7 gap-1.5 text-[12px]"
                    >
                      <RotateCcw size={12} />
                      {t("settings.reset")}
                    </Button>
                  }
                />

                <Field
                  title={t("settings.notifications")}
                  hint={t("settings.notificationsHint")}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.notificationsEnabled}
                    aria-label={t("settings.notifications")}
                    onClick={() => setSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                    className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                      settings.notificationsEnabled ? "bg-brand" : "bg-line-strong"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all duration-200",
                        settings.notificationsEnabled ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                </Field>

                <Field title={t("settings.defaultReminder")}>
                  <select
                    value={settings.defaultReminder}
                    onChange={(e) => setSettings({ defaultReminder: Number(e.target.value) })}
                    className="h-7 rounded-md border border-line bg-panel px-2 text-[12px] text-ink-2"
                  >
                    {[0, 5, 15, 30, 60, 1440].map((m) => (
                      <option key={m} value={m}>
                        {m === 0
                          ? t("chip.reminderOnTime")
                          : m < 60
                            ? t("chip.reminderMin", { n: m })
                            : m < 1440
                              ? t("chip.reminderHour", { n: m / 60 })
                              : t("chip.reminderDay")}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field title={t("settings.testNotification")}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void notify(t("notif.testTitle"), t("notif.testBody"))}
                    className="h-7 text-[12px]"
                  >
                    {t("settings.testNotification")}
                  </Button>
                </Field>

                <Field title={t("settings.language")} hint="简体中文 / English">
                  <div className="flex items-center gap-1 rounded-full bg-panel-2 p-[3px]">
                    {(
                      [
                        ["zh", "简体中文"],
                        ["en", "English"],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSettings({ language: code })}
                        className={cn(
                          "h-7 rounded-full px-3 text-[11.5px] font-medium transition",
                          settings.language === code
                            ? "bg-panel text-ink shadow-[0_1px_2px_rgba(28,26,23,0.08)]"
                            : "text-ink-3 hover:text-ink-2"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  title="AI 服务"
                  hint="填写远端 1Panel AI API 根地址后才启用 Jev；留空即关闭"
                >
                  <Input
                    value={settings.aiServerUrl}
                    onChange={(e) => setSettings({ aiServerUrl: e.target.value.trim() })}
                    placeholder="https://api.example.com"
                    className="h-8 w-[260px] text-[12px]"
                  />
                </Field>
              </div>
            )}

            {tab === "appearance" && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[12.5px] font-medium text-ink">{t("settings.theme")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((item) => {
                      const Icon = item.icon;
                      const active = settings.theme === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setSettings({ theme: item.value })}
                          className={cn(
                            "flex h-[60px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[12px] transition",
                            active
                              ? "border-brand/40 bg-brand/5 text-ink"
                              : "border-line text-ink-2 hover:bg-panel-2"
                          )}
                        >
                          <Icon size={15} className={active ? "text-brand" : "text-ink-3"} />
                          {t(item.label)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[12.5px] font-medium text-ink">{t("settings.pack")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PACKS.map((p) => {
                      const active = settings.themePack === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSettings({ themePack: p.id })}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-2.5 text-left transition",
                            active ? "border-brand/40 bg-brand/5" : "border-line hover:bg-panel-2"
                          )}
                        >
                          <span className="flex shrink-0 items-center -space-x-1.5">
                            {p.swatches.map((c) => (
                              <span
                                key={c}
                                className="size-5 rounded-full ring-1 ring-black/5"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 text-[12.5px] font-medium text-ink">
                              {p.id === "starry" && <StarBuddy size={14} className="text-[#F6C453]" />}
                              {t(p.label)}
                            </span>
                            <span className="mt-0.5 block text-[10.5px] text-ink-3">{t(p.desc)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[12.5px] font-medium text-ink">{t("settings.zoom")}</p>
                  <div className="flex items-center gap-1 rounded-full bg-panel-2 p-[3px]">
                    {ZOOMS.map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setSettings({ zoom: z })}
                        className={cn(
                          "h-7 flex-1 rounded-full text-[12px] font-medium transition",
                          settings.zoom === z
                            ? "bg-panel text-ink shadow-[0_1px_2px_rgba(28,26,23,0.08)]"
                            : "text-ink-3 hover:text-ink-2"
                        )}
                      >
                        {Math.round(z * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "account" && <AccountPanel />}

            {tab === "data" && (
              <div className="divide-y divide-line">
                <Field
                  title={t("settings.export")}
                  hint={t("settings.exportHint")}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void exportJson()}
                      className="h-7 gap-1.5 text-[12px]"
                    >
                      <Download size={12} />
                      {t("settings.exportBtn")}
                    </Button>
                  }
                />
                <Field
                  title={t("settings.resetDemo")}
                  hint={t("settings.resetDemoHint")}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetDemo()}
                      className="h-7 gap-1.5 text-[12px] text-ink-3 hover:text-ink"
                    >
                      <RotateCcw size={12} />
                      重置
                    </Button>
                  }
                />
                <Field
                  title={t("settings.restoreArchived")}
                  hint={t("settings.restoreArchivedHint")}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreArchived()}
                      className="h-7 gap-1.5 text-[12px] text-ink-3 hover:text-ink"
                    >
                      <RotateCcw size={12} />
                      {t("settings.restoreArchived")}
                    </Button>
                  }
                />
                <Field
                  title="软件更新"
                  hint={`当前 v${APP_VERSION} · Windows 安装包由服务器托管`}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void checkUpdate()}
                      disabled={updateState === "checking" || updateState === "installing"}
                      className="h-7 gap-1.5 text-[12px]"
                    >
                      <RefreshCw size={12} className={updateState === "checking" ? "animate-spin" : ""} />
                      {updateState === "checking" ? "检查中…" : "检查更新"}
                    </Button>
                  }
                />
                {(updateState === "available" || updateState === "installing" || update?.mandatory) && update && (
                  <div className="mb-3 rounded-xl border border-line bg-panel-2/50 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[12.5px] font-medium text-ink">发现新版本 v{update.version}</p>
                        <p className="mt-0.5 text-[11px] text-ink-3">
                          {update.size > 0 ? `${(update.size / (1024 * 1024)).toFixed(1)} MB · ` : ""}
                          SHA-256 校验后启动安装程序
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => void installUpdate()}
                        disabled={updateState === "installing"}
                        className="h-7 shrink-0 gap-1.5 text-[12px]"
                      >
                        <Download size={12} />
                        {updateState === "installing" ? "下载中…" : "下载并安装"}
                      </Button>
                    </div>
                    {update.notes && (
                      <p className="mt-2.5 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-ink-2">
                        {update.notes}
                      </p>
                    )}
                    {updateState === "installing" && (
                      <p className="mt-2 text-[11px] text-ink-3">正在下载安装包，完成后会自动打开安装程序。</p>
                    )}
                  </div>
                )}
                {updateState === "latest" && (
                  <p className="mb-3 text-[11.5px] text-emerald-600">已是最新版本。</p>
                )}
                {updateState === "error" && (
                  <p className="mb-3 text-[11.5px] text-red-600">{updateError}</p>
                )}
                <Field title={t("settings.about")} hint={`Tauri 2 · React 19 · shadcn/ui · v${APP_VERSION}`}>
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                    <AppWindow size={12} />
                    Guodelist
                  </span>
                </Field>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
