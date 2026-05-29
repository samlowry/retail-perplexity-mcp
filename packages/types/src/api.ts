import type { BrokerError } from "./errors.js";
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

/** Model and reasoning read from the Perplexity compose form at submit time (best-effort). */
export interface SubmitFormContext {
  submitModel: string | null;
  submitReasoningEnabled: boolean | null;
}

export interface ChatSendResponse {
  ok: true;
  chatId: string;
  /** True when the in-chat-only instruction block was appended on this submit. */
  promptSuffixApplied?: boolean;
  submitContext: SubmitFormContext;
}

export interface ChatCancelRequest {
  sessionId: string;
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
  | HealthResponse;

export type ApiResponse = ApiSuccessResponse | BrokerError;
