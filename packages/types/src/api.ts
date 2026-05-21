import type { BrokerError } from "./errors.js";
import type { JobRecord } from "./jobs.js";
import type { ResponseFormatType } from "./chat.js";
import type { ThreadStatusResponse } from "./thread-status.js";

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
  /** Full thread URL or search slug; omit to start a new topic. */
  chatId?: string;
  responseFormat?: ResponseFormatType;
}

export interface ChatSendResponse {
  ok: true;
  threadUrl: string;
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

export type { ThreadStatusResponse };

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
