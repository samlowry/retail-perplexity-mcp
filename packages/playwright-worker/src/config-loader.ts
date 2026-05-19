import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { WorkerConfig } from "./types.js";

loadEnv();

/** Load worker config from environment (used by smoke script). */
export function loadConfig(cwd = process.cwd()): WorkerConfig {
  return {
    profileDir: resolve(cwd, process.env.PROFILE_DIR ?? "./data/profile"),
    artifactsDir: resolve(cwd, process.env.ARTIFACTS_DIR ?? "./data/artifacts"),
    perplexityUrl: process.env.PERPLEXITY_URL ?? "https://www.perplexity.ai/",
    headless: process.env.HEADLESS === "1",
    defaultTimeoutMs: Number(process.env.DEFAULT_TIMEOUT_MS ?? "180000"),
    allowFileUpload: process.env.ALLOW_FILE_UPLOAD !== "0",
    allowModelSwitch: process.env.ALLOW_MODEL_SWITCH !== "0",
  };
}
