import { loadConfig, PlaywrightWorker } from "@pdb/playwright-worker";
import type { CheckResult } from "./env.js";

export async function checkSession(cwd: string): Promise<CheckResult> {
  const config = loadConfig(cwd);
  const worker = new PlaywrightWorker(config);

  try {
    const result = await worker.ensureSession();
    return {
      name: "perplexity_session",
      ok: result.loggedIn,
      message: result.loggedIn
        ? "Logged in — session ready"
        : `Login required: ${result.error?.message ?? "unknown"}`,
    };
  } catch (error) {
    return {
      name: "perplexity_session",
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
