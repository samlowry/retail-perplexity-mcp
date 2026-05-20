import { mkdir } from "node:fs/promises";
import type { BrowserContext, Page } from "playwright-core";
import { checkAuthState } from "@pdb/ui-selectors";
import { BrokerErrorCode, type BrokerError } from "@pdb/types";
import type { WorkerConfig } from "./types.js";
import { ActionLog } from "./action-log.js";
import { launchBrowserContext } from "./browser-launch.js";

export class BrowserSessionManager {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  readonly actionLog = new ActionLog();

  constructor(private readonly config: WorkerConfig) {}

  getPage(): Page | null {
    return this.page;
  }

  async ensureSession(): Promise<{ loggedIn: boolean; error?: BrokerError }> {
    this.actionLog.record("browser.launch", this.config.browserEngine);
    await mkdir(this.config.profileDir, { recursive: true });

    if (!this.context) {
      this.context = await launchBrowserContext(this.config);
    }

    if (!this.page || this.page.isClosed()) {
      this.page = this.context.pages()[0] ?? (await this.context.newPage());
    }

    this.actionLog.record("page.goto", this.config.perplexityUrl);
    await this.page.goto(this.config.perplexityUrl, {
      waitUntil: "domcontentloaded",
      timeout: this.config.defaultTimeoutMs,
    });

    this.actionLog.record("auth.check");
    const auth = await checkAuthState(this.page);
    if (!auth.loggedIn) {
      return {
        loggedIn: false,
        error: {
          ok: false,
          code: BrokerErrorCode.AUTH_REQUIRED,
          message: "Manual login required in the browser profile",
          lastUiState: "auth_expired",
        },
      };
    }

    return { loggedIn: true };
  }

  async close(): Promise<void> {
    await this.context?.close();
    this.context = null;
    this.page = null;
  }
}
