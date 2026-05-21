import {
  BrokerErrorCode,
  isBrokerError,
  ThreadTaskStatus,
  normalizeChatId,
  type BrokerError,
  type ChatSendRequest,
  type HealthResponse,
  type SessionEnsureResponse,
  type ThreadStatusResponse,
} from "@pdb/types";
import { PlaywrightWorker } from "@pdb/playwright-worker";
import type { AppConfig } from "./config.js";
import { JsonLogger } from "./logger.js";
import { SessionLock } from "./session-lock.js";

/** Stateless broker: thread URL is the task id; status is read from Perplexity UI on each poll. */
export class BrokerService {
  readonly lock: SessionLock;
  readonly worker: PlaywrightWorker;
  readonly log: JsonLogger;

  constructor(private readonly config: AppConfig) {
    this.lock = new SessionLock(config.concurrentRequestPolicy);
    this.log = new JsonLogger(config.logLevel as "info");
    this.worker = new PlaywrightWorker({
      profileDir: config.profileDir,
      artifactsDir: config.artifactsDir,
      perplexityUrl: config.perplexityUrl,
      browserEngine: config.browserEngine,
      headless: config.headless,
      defaultTimeoutMs: config.defaultTimeoutMs,
      allowFileUpload: config.allowFileUpload,
      allowModelSwitch: config.allowModelSwitch,
    });
  }

  async ensureSession(sessionId: string): Promise<SessionEnsureResponse | BrokerError> {
    return this.lock.runExclusive(sessionId, async () => {
      const result = await this.worker.ensureSession();
      if (result.error) return result.error;
      return {
        ok: true,
        sessionId,
        status: result.loggedIn ? "ready" : "login_required",
        loggedIn: result.loggedIn,
      };
    });
  }

  async newThread(sessionId: string): Promise<{ ok: true } | BrokerError> {
    return this.lock.runExclusive(sessionId, async () => {
      const session = await this.worker.ensureSession();
      if (session.error) return session.error;
      await this.worker.createNewThread();
      return { ok: true };
    });
  }

  /**
   * Send prompt synchronously until thread URL is known (does not wait for full generation).
   */
  async submitChat(
    request: ChatSendRequest,
  ): Promise<{ threadUrl: string } | { error: BrokerError }> {
    try {
      const threadUrl = request.chatId ? normalizeChatId(request.chatId) : undefined;

      const result = await this.lock.runExclusive(request.sessionId, async () => {
        return this.worker.submitPrompt(request.text, { threadUrl });
      });

      if (isBrokerError(result)) {
        return { error: result };
      }

      return { threadUrl: result.threadUrl };
    } catch (error) {
      return { error: this.errorFromThrown(error) };
    }
  }

  /** Read task status from Perplexity UI for the given thread URL. */
  async getThreadStatus(
    sessionId: string,
    chatId: string,
    responseFormat: ChatSendRequest["responseFormat"] = "markdown",
  ): Promise<ThreadStatusResponse | BrokerError> {
    const threadUrl = normalizeChatId(chatId);
    try {
      const result = await this.lock.runExclusive(sessionId, async () => {
        const ready = await this.worker.ensureBrowserReady();
        if (isBrokerError(ready)) return ready;
        return this.worker.getThreadStatus(threadUrl, responseFormat ?? "markdown");
      });

      if (isBrokerError(result)) {
        return result;
      }

      if (result.status === ThreadTaskStatus.ERROR && result.error) {
        return {
          ok: true,
          threadUrl,
          status: ThreadTaskStatus.ERROR,
          visibleChars: result.visibleChars,
          error: result.error,
          lastUiState: result.lastUiState,
        };
      }

      if (result.status === ThreadTaskStatus.RUNNING) {
        return {
          ok: true,
          threadUrl,
          status: ThreadTaskStatus.RUNNING,
          visibleChars: result.visibleChars,
          lastUiState: result.lastUiState,
        };
      }

      return {
        ok: true,
        threadUrl,
        status: ThreadTaskStatus.COMPLETED,
        visibleChars: result.visibleChars,
        answer: result.answer,
        lastUiState: result.lastUiState,
      };
    } catch (error) {
      return this.errorFromThrown(error);
    }
  }

  async cancel(sessionId: string): Promise<{ cancelled: boolean } | BrokerError> {
    return this.lock.runExclusive(sessionId, async () => {
      const cancelled = await this.worker.cancel();
      return { cancelled };
    });
  }

  async upload(sessionId: string, filePath: string): Promise<{ uploaded: boolean } | BrokerError> {
    if (!this.config.allowFileUpload) {
      return {
        ok: false,
        code: BrokerErrorCode.ATTACHMENT_FAILED,
        message: "File upload disabled",
      };
    }
    return this.lock.runExclusive(sessionId, async () => {
      await this.worker.upload(filePath);
      return { uploaded: true };
    });
  }

  getHealth(): HealthResponse {
    return {
      ok: true,
      broker: "up",
      browser: this.worker.isBrowserUp() ? "up" : "down",
    };
  }

  private errorFromThrown(error: unknown): BrokerError {
    if (error instanceof Error && error.message.includes("Session busy")) {
      return {
        ok: false,
        code: BrokerErrorCode.CONFLICT,
        message: error.message,
      };
    }
    return {
      ok: false,
      code: BrokerErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
