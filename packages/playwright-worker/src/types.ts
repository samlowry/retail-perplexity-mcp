/** Browser backend for the worker session. */
export type BrowserEngine = "camoufox" | "chromium";

export interface WorkerConfig {
  profileDir: string;
  artifactsDir: string;
  perplexityUrl: string;
  /** camoufox = Firefox anti-detect (default); chromium = legacy Playwright Chromium */
  browserEngine: BrowserEngine;
  headless: boolean;
  defaultTimeoutMs: number;
  allowFileUpload: boolean;
  allowModelSwitch: boolean;
}
