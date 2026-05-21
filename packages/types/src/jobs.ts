export const JobStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  WAITING_USER: "waiting_user",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  TIMED_OUT: "timed_out",
  CANCELLED: "cancelled",
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

export const JobAction = {
  ENSURE_SESSION: "ensure_session",
  NEW_THREAD: "new_thread",
  SEND_PROMPT: "send_prompt",
  CANCEL_GENERATION: "cancel_generation",
  UPLOAD_ATTACHMENT: "upload_attachment",
  GET_LAST_ANSWER: "get_last_answer",
} as const;

export type JobActionType = (typeof JobAction)[keyof typeof JobAction];

export interface JobTimings {
  queueMs?: number;
  sendMs?: number;
  generationMs?: number;
  extractMs?: number;
}

/** Agent-facing generation phase (MCP poll/submit). */
export const AgentGenerationStatus = {
  GENERATING: "generating",
  FINISHED: "finished",
} as const;

export type AgentGenerationStatusType =
  (typeof AgentGenerationStatus)[keyof typeof AgentGenerationStatus];

export interface JobRecord {
  jobId: string;
  sessionId: string;
  action: JobActionType;
  status: JobStatusType;
  payload: Record<string, unknown>;
  timeoutMs: number;
  idempotencyKey?: string;
  /** Perplexity thread URL captured after prompt submit (stable per job, not used as job id). */
  threadUrl?: string;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: import("./errors.js").BrokerError;
  timings?: JobTimings;
}
