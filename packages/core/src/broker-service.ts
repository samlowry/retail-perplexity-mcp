import {
  BrokerErrorCode,
  JobAction,
  JobStatus,
  type BrokerError,
  type ChatAnswerResult,
  type ChatSendRequest,
  type HealthResponse,
  type SessionEnsureResponse,
} from "@pdb/types";
import { PlaywrightWorker } from "@pdb/playwright-worker";
import type { AppConfig } from "./config.js";
import { JsonLogger } from "./logger.js";
import { JobStore } from "./job-store.js";
import { SessionLock } from "./session-lock.js";
import { IdempotencyCache } from "./idempotency.js";

/** Orchestrates jobs and delegates UI work to PlaywrightWorker. */
export class BrokerService {
  readonly jobs = new JobStore();
  readonly lock: SessionLock;
  readonly idempotency = new IdempotencyCache();
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

  async sendChat(
    request: ChatSendRequest,
  ): Promise<{ jobId: string; answer?: ChatAnswerResult; error?: BrokerError }> {
    if (request.idempotencyKey) {
      const existing = this.idempotency.get(request.idempotencyKey);
      if (existing) {
        const job = this.jobs.get(existing);
        if (job?.result) {
          return { jobId: existing, answer: job.result as ChatAnswerResult };
        }
      }
    }

    const job = this.jobs.create({
      sessionId: request.sessionId,
      action: JobAction.SEND_PROMPT,
      payload: request as unknown as Record<string, unknown>,
      timeoutMs: request.timeoutMs ?? this.config.defaultTimeoutMs,
      idempotencyKey: request.idempotencyKey,
    });

    if (request.idempotencyKey) {
      this.idempotency.set(request.idempotencyKey, job.jobId);
    }

    if (request.wait === false) {
      void this.runSendJob(job.jobId, request);
      return { jobId: job.jobId };
    }

    try {
      this.jobs.updateStatus(job.jobId, JobStatus.RUNNING);

      const result = await this.lock.runExclusive(request.sessionId, async () => {
        const session = await this.worker.ensureSession();
        if (session.error) return session.error;
        return this.worker.sendPromptAndWait(request.text, {
          newThread: request.newThread,
          timeoutMs: request.timeoutMs,
          responseFormat: request.responseFormat,
        });
      });

      if ("ok" in result && result.ok === false) {
        this.jobs.patch(job.jobId, { status: JobStatus.FAILED, error: result });
        return { jobId: job.jobId, error: result };
      }

      this.jobs.patch(job.jobId, {
        status: JobStatus.SUCCEEDED,
        result,
        timings: (result as ChatAnswerResult).timings,
      });
      return { jobId: job.jobId, answer: result as ChatAnswerResult };
    } catch (error) {
      const brokerError = this.errorFromThrown(error);
      this.jobs.patch(job.jobId, { status: JobStatus.FAILED, error: brokerError });
      return { jobId: job.jobId, error: brokerError };
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

  private async runSendJob(jobId: string, request: ChatSendRequest): Promise<void> {
    try {
      this.jobs.updateStatus(jobId, JobStatus.RUNNING);
      const result = await this.lock.runExclusive(request.sessionId, async () => {
        const session = await this.worker.ensureSession();
        if (session.error) return session.error;
        return this.worker.sendPromptAndWait(request.text, {
          newThread: request.newThread,
          timeoutMs: request.timeoutMs,
          responseFormat: request.responseFormat,
        });
      });
      if ("ok" in result && result.ok === false) {
        this.jobs.patch(jobId, { status: JobStatus.FAILED, error: result });
        return;
      }
      this.jobs.patch(jobId, {
        status: JobStatus.SUCCEEDED,
        result,
        timings: (result as ChatAnswerResult).timings,
      });
    } catch (error) {
      this.jobs.patch(jobId, {
        status: JobStatus.FAILED,
        error: this.errorFromThrown(error),
      });
    }
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
