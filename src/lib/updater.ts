import { APP_VERSION, isTauri } from "@/lib/platform";

export type DesktopUpdate = {
  version: string;
  notes: string;
  url: string;
  size: number;
  sha256: string;
  fileName: string;
  publishedAt: string;
  mandatory: boolean;
};

const GITHUB_REPO =
  (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim() || "TankNee/guodelist";
const GITHUB_RELEASES = `https://github.com/${GITHUB_REPO}/releases`;

type GithubAsset = {
  name: string;
  size: number;
  browser_download_url: string;
  digest?: string | null;
};

type GithubRelease = {
  tag_name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
  assets?: GithubAsset[];
};

function versionParts(value: string): number[] {
  return value
    .trim()
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function isNewerVersion(remote: string, current: string): boolean {
  const left = versionParts(remote);
  const right = versionParts(current);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

function windowsAsset(assets: GithubAsset[]): GithubAsset | undefined {
  const installers = assets.filter((asset) => /\.(exe|msi)$/i.test(asset.name));
  return (
    installers.find((asset) => /setup.*\.exe$/i.test(asset.name)) ??
    installers.find((asset) => /\.exe$/i.test(asset.name)) ??
    installers.find((asset) => /\.msi$/i.test(asset.name))
  );
}

function digestOf(asset: GithubAsset): string {
  const digest = asset.digest ?? "";
  const match = digest.match(/(?:sha256:)?([a-f0-9]{64})/i);
  return match?.[1]?.toLowerCase() ?? "";
}

async function checksumFor(
  release: GithubRelease,
  asset: GithubAsset,
): Promise<string> {
  const direct = digestOf(asset);
  if (direct) return direct;

  const checksumAsset = (release.assets ?? []).find(
    (candidate) =>
      /\.sha256$/i.test(candidate.name) &&
      candidate.name.toLowerCase().startsWith(asset.name.toLowerCase().replace(/\.(exe|msi)$/i, "")),
  );
  if (!checksumAsset) return "";
  try {
    const response = await fetch(checksumAsset.browser_download_url, {
      headers: { accept: "text/plain" },
    });
    if (!response.ok) return "";
    const match = (await response.text()).match(/\b[a-f0-9]{64}\b/i);
    return match?.[0]?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

export async function updateFromGithubRelease(
  release: GithubRelease,
  currentVersion = APP_VERSION,
): Promise<DesktopUpdate | null> {
  const tag = release.tag_name ?? "";
  const version = tag.replace(/^v/i, "");
  if (!version || !isNewerVersion(version, currentVersion)) return null;

  const asset = windowsAsset(release.assets ?? []);
  if (!asset) return null;

  return {
    version,
    notes: release.body ?? "",
    url: asset.browser_download_url,
    size: asset.size,
    sha256: await checksumFor(release, asset),
    fileName: asset.name,
    publishedAt: release.published_at ?? "",
    mandatory: /\[mandatory\]/i.test(release.body ?? ""),
  };
}

export async function checkDesktopUpdate(): Promise<DesktopUpdate | null> {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (response.status === 404) return null;
  if (response.status === 403) {
    throw new Error("GitHub Releases 访问受限，请稍后再试。");
  }
  if (!response.ok) {
    throw new Error(`GitHub Releases 返回 HTTP ${response.status}`);
  }
  return updateFromGithubRelease((await response.json()) as GithubRelease);
}

export async function installDesktopUpdate(update: DesktopUpdate): Promise<void> {
  if (!isTauri()) {
    window.open(update.url, "_blank", "noopener,noreferrer");
    return;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<string>("download_and_install_update", {
    url: update.url,
    sha256: update.sha256,
    fileName: update.fileName,
  });
}

export const githubReleasesUrl = GITHUB_RELEASES;
