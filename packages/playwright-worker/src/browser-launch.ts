import { platform } from "node:os";
import { Camoufox, type LaunchOptions } from "camoufox-js";
import { chromium, type BrowserContext } from "playwright-core";
import type { WorkerConfig } from "./types.js";

/** Map Node platform to Camoufox fingerprint OS. */
function hostOs(): LaunchOptions["os"] {
  if (platform() === "darwin") return "macos";
  if (platform() === "win32") return "windows";
  return "linux";
}

/**
 * Launch a persistent browser context for Perplexity.
 * Default engine is Camoufox (Firefox anti-detect) to pass Cloudflare checks.
 */
export async function launchBrowserContext(config: WorkerConfig): Promise<BrowserContext> {
  if (config.browserEngine === "chromium") {
    return chromium.launchPersistentContext(config.profileDir, {
      headless: config.headless,
      viewport: { width: 1280, height: 900 },
    });
  }

  return Camoufox({
    user_data_dir: config.profileDir,
    headless: config.headless,
    os: hostOs(),
    // humanize=false: real mouse/keyboard work in headed mode (humanize shows a red cursor overlay).
    humanize: false,
    config: { showcursor: false },
    window: [1280, 900],
    enable_cache: true,
    // Skip WebGL DB sampling (needs better-sqlite3 native build). Anti-detect still works for CF.
    block_webgl: true,
  });
}

/** Whether Camoufox browser binaries are installed (via `pnpm camoufox:fetch`). */
export async function checkCamoufoxBinaries(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (process.env.BROWSER_ENGINE === "chromium" || process.env.PLAYWRIGHT_BROWSER === "chromium") {
    return { ok: true, message: "Using Chromium (camoufox fetch not required)" };
  }

  try {
    const pkg = await import("camoufox-js/dist/pkgman.js");
    const version = pkg.installedVerStr();
    return { ok: true, message: `Camoufox binaries installed (${version})` };
  } catch {
    return {
      ok: false,
      message: "Camoufox not installed. Run: pnpm camoufox:fetch",
    };
  }
}
