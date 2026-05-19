import type { BrokerError } from "./errors.js";
import type { JobRecord, JobStatusType } from "./jobs.js";
import type { ChatAnswerResult, ResponseFormatType } from "./chat.js";

export interface SessionEnsureRequest {
  sessionId: string;
}

export interface SessionEnsureResponse {
  ok: true;
  sessionId: string;
  status: "ready" | "login_required" | "error";
  loggedIn: boolean;
}

export interface ThreadNewRequest {
  sessionId: string;
}

export interface ThreadNewResponse {
  ok: true;
  threadId?: string;
}

export interface ChatSendRequest {
  sessionId: string;
  text: string;
  newThread?: boolean;
  timeoutMs?: number;
  wait?: boolean;
  responseFormat?: ResponseFormatType;
  idempotencyKey?: string;
}

export interface ChatSendResponse {
  ok: true;
  jobId: string;
  threadId?: string;
  status: JobStatusType;
  answer?: ChatAnswerResult;
}

export interface ChatCancelRequest {
  sessionId: string;
  jobId?: string;
}

export interface ChatCancelResponse {
  ok: true;
  cancelled: boolean;
}

export interface AttachmentUploadRequest {
  sessionId: string;
  filePath: string;
}

export interface AttachmentUploadResponse {
  ok: true;
  uploaded: boolean;
}

export interface JobGetResponse {
  ok: true;
  job: JobRecord;
}

export interface HealthResponse {
  ok: true;
  broker: "up";
  browser: "up" | "down" | "unknown";
  session?: {
    sessionId: string;
    loggedIn: boolean;
    lastUiState?: string;
  };
}

export type ApiSuccessResponse =
  | SessionEnsureResponse
  | ThreadNewResponse
  | ChatSendResponse
  | ChatCancelResponse
  | AttachmentUploadResponse
  | JobGetResponse
  | HealthResponse;

export type ApiResponse = ApiSuccessResponse | BrokerError;
