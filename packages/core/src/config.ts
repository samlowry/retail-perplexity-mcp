import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv();

export type ConcurrentRequestPolicy = "reject" | "fifo";

export interface AppConfig {
  brokerHost: string;
  brokerPort: number;
  /** camoufox (default) or chromium legacy */
  browserEngine: "camoufox" | "chromium";
  profileDir: string;
  artifactsDir: string;
  logLevel: string;
  defaultTimeoutMs: number;
  headless: boolean;
  allowFileUpload: boolean;
  allowModelSwitch: boolean;
  perplexityUrl: string;
  concurrentRequestPolicy: ConcurrentRequestPolicy;
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === "1" || value.toLowerCase() === "true";
}

/** Load application configuration from environment variables. */
export function loadConfig(cwd = process.cwd()): AppConfig {
  const profileDir = process.env.PROFILE_DIR ?? "./data/profile";
  const artifactsDir = process.env.ARTIFACTS_DIR ?? "./data/artifacts";

  return {
    brokerHost: process.env.BROKER_HOST ?? "127.0.0.1",
    brokerPort: Number(process.env.BROKER_PORT ?? "3317"),
    browserEngine: (() => {
      const raw = process.env.BROWSER_ENGINE ?? process.env.PLAYWRIGHT_BROWSER ?? "camoufox";
      return raw === "chromium" ? "chromium" : "camoufox";
    })(),
    profileDir: resolve(cwd, profileDir),
    artifactsDir: resolve(cwd, artifactsDir),
    logLevel: process.env.LOG_LEVEL ?? "info",
    defaultTimeoutMs: Number(process.env.DEFAULT_TIMEOUT_MS ?? "900000"),
    headless: parseBool(process.env.HEADLESS, false),
    allowFileUpload: parseBool(process.env.ALLOW_FILE_UPLOAD, true),
    allowModelSwitch: parseBool(process.env.ALLOW_MODEL_SWITCH, true),
    perplexityUrl: process.env.PERPLEXITY_URL ?? "https://www.perplexity.ai/",
    concurrentRequestPolicy: (process.env.CONCURRENT_REQUEST_POLICY ?? "reject") as ConcurrentRequestPolicy,
  };
}
