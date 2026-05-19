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
import { getLastAnswer } from "./extract.js";
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
