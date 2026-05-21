import {
  BrokerErrorCode,
  type AnswerPayload,
  type BrokerError,
  type ChatAnswerResult,
  type ResponseFormatType,
} from "@pdb/types";
import { BrowserSessionManager } from "./session.js";
import { newThread } from "./thread.js";
import { cancelGeneration, sendPrompt, waitForCompletion } from "./chat.js";
import {
  extractAnswerResult,
  measureVisibleAnswerChars,
  openThreadUrl,
  pollGenerationPhase,
} from "./generation.js";
import { ThreadTaskStatus, type ThreadTaskStatusType } from "@pdb/types";
import { getLastAnswer } from "./extract.js";
import { waitForUiState } from "@pdb/ui-state";
import { UiState } from "@pdb/ui-state";
import { uploadFile } from "./attachment.js";
import type { WorkerConfig } from "./types.js";
import { captureArtifacts } from "./artifacts.js";

/** High-level Playwright operations for Perplexity UI. */
export class PlaywrightWorker {
  readonly session: BrowserSessionManager;

  constructor(private readonly config: WorkerConfig) {
    this.session = new BrowserSessionManager(config);
  }

  async ensureSession() {
    return this.session.ensureSession();
  }

  async openHome(): Promise<void> {
    const page = this.session.getPage();
    if (!page) throw new Error("Session not initialized");
    await page.goto(this.config.perplexityUrl, { waitUntil: "domcontentloaded" });
  }

  async createNewThread(): Promise<void> {
    const page = this.session.getPage();
    if (!page) throw new Error("Session not initialized");
    await newThread(page);
  }

  /**
   * Submit a prompt without waiting for generation to finish.
   * Captures thread URL for later poll/navigation (multitask sidebar topics).
   */
  async submitPrompt(
    text: string,
    options: { newThread?: boolean },
  ): Promise<{ threadUrl: string } | BrokerError> {
    const page = this.session.getPage();
    if (!page) {
      return {
        ok: false,
        code: BrokerErrorCode.SESSION_BROKEN,
        message: "No browser page",
      };
    }

    try {
      if (options.newThread) await newThread(page);
      const sendStart = Date.now();
      await sendPrompt(page, text);
      const sendMs = Date.now() - sendStart;
      void sendMs;

      await waitForUiState(page, [UiState.GENERATING, UiState.COMPLETE, UiState.READY], 10_000);
      const threadUrl = page.url();
      return { threadUrl };
    } catch (error) {
      if (typeof error === "object" && error !== null && "ok" in error) {
        return error as BrokerError;
      }
      const artifacts = await captureArtifacts(page, this.config.artifactsDir, "submit-error");
      return {
        ok: false,
        code: BrokerErrorCode.PROMPT_SEND_FAILED,
        message: error instanceof Error ? error.message : String(error),
        artifacts: {
          screenshot: artifacts.screenshot,
          htmlSnapshot: artifacts.htmlSnapshot,
        },
      };
    }
  }

  /** Open job thread URL if needed and return generating vs finished without blocking for completion. */
  async pollJobGeneration(
    threadUrl: string | undefined,
  ): Promise<
    | { phase: "generating" | "finished"; uiState: string; error?: BrokerError }
    | BrokerError
  > {
    const page = this.session.getPage();
    if (!page) {
      return {
        ok: false,
        code: BrokerErrorCode.SESSION_BROKEN,
        message: "No browser page",
      };
    }

    if (threadUrl) {
      await openThreadUrl(page, threadUrl);
    }

    const poll = await pollGenerationPhase(page);
    return {
      phase: poll.phase,
      uiState: poll.uiState,
      error: poll.error,
    };
  }

  /**
   * Open thread URL, read UI, return running/completed/error and optional answer or visible char count.
   */
  async getThreadStatus(
    threadUrl: string,
    responseFormat: ResponseFormatType,
  ): Promise<
    | {
        status: ThreadTaskStatusType;
        visibleChars?: number;
        answer?: ChatAnswerResult;
        error?: BrokerError;
        lastUiState?: string;
      }
    | BrokerError
  > {
    const page = this.session.getPage();
    if (!page) {
      return {
        ok: false,
        code: BrokerErrorCode.SESSION_BROKEN,
        message: "No browser page",
      };
    }

    await openThreadUrl(page, threadUrl);
    const poll = await pollGenerationPhase(page);
    const visibleChars = await measureVisibleAnswerChars(page);

    if (poll.error) {
      return {
        status: ThreadTaskStatus.ERROR,
        visibleChars,
        error: poll.error,
        lastUiState: poll.uiState,
      };
    }

    if (poll.phase === "generating") {
      return {
        status: ThreadTaskStatus.RUNNING,
        visibleChars,
        lastUiState: poll.uiState,
      };
    }

    const extracted = await extractAnswerResult(page, responseFormat, {
      sendMs: 0,
      generationMs: 0,
    });
    if ("ok" in extracted && extracted.ok === false) {
      return {
        status: ThreadTaskStatus.ERROR,
        visibleChars,
        error: extracted,
        lastUiState: poll.uiState,
      };
    }

    const completed = extracted as ChatAnswerResult;
    return {
      status: ThreadTaskStatus.COMPLETED,
      visibleChars: completed.answerText.length,
      answer: completed,
      lastUiState: poll.uiState,
    };
  }

  /** Extract answer on the current page after generation finished. */
  async completeJobAnswer(
    responseFormat: ResponseFormatType,
    timings: { sendMs: number; generationMs: number },
  ): Promise<ChatAnswerResult | BrokerError> {
    const page = this.session.getPage();
    if (!page) {
      return {
        ok: false,
        code: BrokerErrorCode.SESSION_BROKEN,
        message: "No browser page",
      };
    }
    const poll = await pollGenerationPhase(page);
    if (poll.phase !== "finished" || poll.error) {
      const mapped = poll.error ?? {
        ok: false as const,
        code: BrokerErrorCode.UNKNOWN_UI_STATE,
        message: `Answer not ready in UI state ${poll.uiState}`,
        lastUiState: poll.uiState,
      };
      return mapped;
    }
    return extractAnswerResult(page, responseFormat, timings);
  }

  async sendPromptAndWait(
    text: string,
    options: { newThread?: boolean; timeoutMs?: number; responseFormat?: ResponseFormatType },
  ): Promise<ChatAnswerResult | BrokerError> {
    const page = this.session.getPage();
    if (!page) {
      return {
        ok: false,
        code: BrokerErrorCode.SESSION_BROKEN,
        message: "No browser page",
      };
    }

    const timeoutMs = options.timeoutMs ?? this.config.defaultTimeoutMs;
    const t0 = Date.now();

    try {
      if (options.newThread) await newThread(page);
      const sendStart = Date.now();
      await sendPrompt(page, text);
      const sendMs = Date.now() - sendStart;

      const genStart = Date.now();
      await waitForCompletion(page, timeoutMs, this.config.artifactsDir);
      const generationMs = Date.now() - genStart;

      const extractStart = Date.now();
      const answer = await getLastAnswer(page, options.responseFormat ?? "markdown");
      const extractMs = Date.now() - extractStart;

      return {
        threadId: undefined,
        messageId: undefined,
        status: "completed",
        answerText: answer.text,
        answerMarkdown: answer.markdown ?? answer.text,
        sources: answer.sources,
        timings: {
          queueMs: 0,
          sendMs,
          generationMs,
          extractMs,
        },
        artifacts: {},
      };
    } catch (error) {
      if (typeof error === "object" && error !== null && "ok" in error) {
        return error as BrokerError;
      }
      const artifacts = await captureArtifacts(page, this.config.artifactsDir, "error");
      return {
        ok: false,
        code: BrokerErrorCode.UNKNOWN_UI_STATE,
        message: error instanceof Error ? error.message : String(error),
        artifacts: {
          screenshot: artifacts.screenshot,
          htmlSnapshot: artifacts.htmlSnapshot,
        },
      };
    } finally {
      void t0;
    }
  }

  async getLastAnswer(format: ResponseFormatType): Promise<AnswerPayload> {
    const page = this.session.getPage();
    if (!page) throw new Error("Session not initialized");
    return getLastAnswer(page, format);
  }

  async cancel(): Promise<boolean> {
    const page = this.session.getPage();
    if (!page) return false;
    return cancelGeneration(page);
  }

  async upload(filePath: string): Promise<void> {
    if (!this.config.allowFileUpload) {
      throw new Error("File upload disabled by config");
    }
    const page = this.session.getPage();
    if (!page) throw new Error("Session not initialized");
    await uploadFile(page, filePath);
  }

  isBrowserUp(): boolean {
    return this.session.getPage() !== null;
  }
}
