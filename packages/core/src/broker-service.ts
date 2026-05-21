import {
  AgentGenerationStatus,
  BrokerErrorCode,
  isBrokerError,
  JobAction,
  JobStatus,
  type AgentGenerationStatusType,
  type BrokerError,
  type ChatAnswerResult,
  type ChatSendRequest,
  type HealthResponse,
  type JobPollResponse,
  type JobRecord,
  type ResponseFormatType,
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
        if (job && !this.isTerminal(job)) {
          return { jobId: existing };
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
      void this.runSubmitJob(job.jobId, request);
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

  /**
   * Poll job by id: opens stored thread URL when needed, checks UI, completes job when answer is ready.
   */
  async pollJob(jobId: string): Promise<JobPollResponse | BrokerError> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        ok: false,
        code: BrokerErrorCode.VALIDATION_ERROR,
        message: `Job not found: ${jobId}`,
      };
    }

    if (this.isTerminal(job)) {
      return this.jobToPollResponse(job);
    }

    if (this.isJobTimedOut(job)) {
      const timeoutError: BrokerError = {
        ok: false,
        code: BrokerErrorCode.GENERATION_TIMEOUT,
        message: `Generation exceeded timeoutMs (${job.timeoutMs} ms) for job ${jobId}`,
        lastUiState: "timed_out",
      };
      this.jobs.patch(jobId, { status: JobStatus.TIMED_OUT, error: timeoutError });
      return this.jobToPollResponse(this.jobs.get(jobId)!);
    }

    if (job.status === JobStatus.QUEUED) {
      return {
        ok: true,
        jobId,
        status: AgentGenerationStatus.GENERATING,
        threadUrl: job.threadUrl,
        brokerStatus: job.status,
      };
    }

    const format = this.responseFormatFromJob(job);
    const genStart = Date.parse(job.updatedAt);

    try {
      const pollResult = await this.lock.runExclusive(job.sessionId, async () => {
        const session = await this.worker.ensureSession();
        if (session.error) return session.error;
        return this.worker.pollJobGeneration(job.threadUrl);
      });

      if (isBrokerError(pollResult)) {
        this.jobs.patch(jobId, { status: JobStatus.FAILED, error: pollResult });
        return this.jobToPollResponse(this.jobs.get(jobId)!);
      }

      if (pollResult.error) {
        this.jobs.patch(jobId, { status: JobStatus.FAILED, error: pollResult.error });
        return this.jobToPollResponse(this.jobs.get(jobId)!);
      }

      if (pollResult.phase === "generating") {
        return {
          ok: true,
          jobId,
          status: AgentGenerationStatus.GENERATING,
          threadUrl: job.threadUrl,
          brokerStatus: JobStatus.RUNNING,
          lastUiState: pollResult.uiState,
        };
      }

      const generationMs = Math.max(0, Date.now() - genStart);
      const answer = await this.lock.runExclusive(job.sessionId, async () => {
        const session = await this.worker.ensureSession();
        if (session.error) return session.error;
        if (job.threadUrl) {
          const nav = await this.worker.pollJobGeneration(job.threadUrl);
          if (isBrokerError(nav)) return nav;
        }
        return this.worker.completeJobAnswer(format, { sendMs: 0, generationMs });
      });

      if ("ok" in answer && answer.ok === false) {
        this.jobs.patch(jobId, { status: JobStatus.FAILED, error: answer });
        return this.jobToPollResponse(this.jobs.get(jobId)!);
      }

      this.jobs.patch(jobId, {
        status: JobStatus.SUCCEEDED,
        result: answer,
        timings: (answer as ChatAnswerResult).timings,
      });
      return this.jobToPollResponse(this.jobs.get(jobId)!);
    } catch (error) {
      const brokerError = this.errorFromThrown(error);
      this.jobs.patch(jobId, { status: JobStatus.FAILED, error: brokerError });
      return this.jobToPollResponse(this.jobs.get(jobId)!);
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

  private async runSubmitJob(jobId: string, request: ChatSendRequest): Promise<void> {
    try {
      this.jobs.updateStatus(jobId, JobStatus.RUNNING);

      const result = await this.lock.runExclusive(request.sessionId, async () => {
        const session = await this.worker.ensureSession();
        if (session.error) return session.error;
        return this.worker.submitPrompt(request.text, {
          newThread: request.newThread,
        });
      });

      if (isBrokerError(result)) {
        this.jobs.patch(jobId, { status: JobStatus.FAILED, error: result });
        return;
      }

      this.jobs.patch(jobId, {
        status: JobStatus.RUNNING,
        threadUrl: result.threadUrl,
      });
    } catch (error) {
      this.jobs.patch(jobId, {
        status: JobStatus.FAILED,
        error: this.errorFromThrown(error),
      });
    }
  }

  private jobToPollResponse(job: JobRecord): JobPollResponse {
    const agentStatus = this.agentStatusFromJob(job);
    return {
      ok: true,
      jobId: job.jobId,
      status: agentStatus,
      threadUrl: job.threadUrl,
      answer: job.result as ChatAnswerResult | undefined,
      error: job.error,
      brokerStatus: job.status,
      lastUiState: job.error?.lastUiState,
    };
  }

  private agentStatusFromJob(job: JobRecord): AgentGenerationStatusType {
    if (
      job.status === JobStatus.SUCCEEDED ||
      job.status === JobStatus.FAILED ||
      job.status === JobStatus.TIMED_OUT ||
      job.status === JobStatus.CANCELLED
    ) {
      return AgentGenerationStatus.FINISHED;
    }
    return AgentGenerationStatus.GENERATING;
  }

  private isTerminal(job: JobRecord): boolean {
    return (
      job.status === JobStatus.SUCCEEDED ||
      job.status === JobStatus.FAILED ||
      job.status === JobStatus.TIMED_OUT ||
      job.status === JobStatus.CANCELLED
    );
  }

  private isJobTimedOut(job: JobRecord): boolean {
    const elapsed = Date.now() - Date.parse(job.createdAt);
    return elapsed > job.timeoutMs;
  }

  private responseFormatFromJob(job: JobRecord): ResponseFormatType {
    const format = job.payload.responseFormat;
    if (format === "text" || format === "markdown" || format === "html_fragment") {
      return format;
    }
    return "markdown";
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
