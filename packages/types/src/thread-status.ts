import type { BrokerError } from "./errors.js";
import type { ChatAnswerResult, ResponseFormatType } from "./chat.js";

/** Agent-facing task status (MCP perplexity_status). */
export const ThreadTaskStatus = {
  RUNNING: "running",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type ThreadTaskStatusType = (typeof ThreadTaskStatus)[keyof typeof ThreadTaskStatus];

export interface ThreadStatusRequest {
  sessionId: string;
  chatId: string;
  responseFormat?: ResponseFormatType;
}

export interface ThreadStatusResponse {
  ok: true;
  chatId: string;
  status: ThreadTaskStatusType;
  /** Visible answer text length on page (for progress between polls). */
  visibleChars?: number;
  answer?: ChatAnswerResult;
  error?: BrokerError;
  lastUiState?: string;
}

export interface ChatSubmitResponse {
  ok: true;
  chatId: string;
}
