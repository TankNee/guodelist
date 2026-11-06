import { describe, expect, it } from "vitest";
import { isNewerVersion, updateFromGithubRelease } from "@/lib/updater";

const release = {
  tag_name: "v0.9.8",
  body: "Today and sync fixes\n[mandatory]",
  html_url: "https://github.com/TankNee/guodelist/releases/tag/v0.9.8",
  published_at: "2026-11-06T03:00:00.000Z",
  assets: [
    {
      name: "Guodelist_0.9.8_x64-setup.exe",
      size: 3_659_063,
      browser_download_url:
        "https://github.com/TankNee/guodelist/releases/download/v0.9.8/Guodelist_0.9.8_x64-setup.exe",
      digest: "sha256:abc123",
    },
    {
      name: "source.zip",
      size: 100,
      browser_download_url: "https://example.com/source.zip",
    },
  ],
};

describe("updateFromGithubRelease", () => {
  it("selects the Windows setup asset and parses the release", async () => {
    await expect(updateFromGithubRelease(release, "0.9.7")).resolves.toMatchObject({
      version: "0.9.8",
      notes: "Today and sync fixes\n[mandatory]",
      size: 3_659_063,
      fileName: "Guodelist_0.9.8_x64-setup.exe",
      mandatory: true,
    });
  });

  it("returns null for the current or an older version", async () => {
    await expect(updateFromGithubRelease(release, "0.9.8")).resolves.toBeNull();
    await expect(updateFromGithubRelease({ ...release, tag_name: "v0.9.6" }, "0.9.7")).resolves.toBeNull();
  });

  it("returns null when there is no Windows installer asset", async () => {
    await expect(
      updateFromGithubRelease({ ...release, assets: release.assets.slice(1) }, "0.9.7"),
    ).resolves.toBeNull();
  });

  it("compares dotted versions numerically", () => {
    expect(isNewerVersion("0.10.0", "0.9.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.99.99")).toBe(true);
    expect(isNewerVersion("0.9.8", "0.9.8")).toBe(false);
    expect(isNewerVersion("0.9.8", "0.9.9")).toBe(false);
  });
});
