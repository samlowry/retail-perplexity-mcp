/** Machine-readable broker error codes. */
export const BrokerErrorCode = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  SESSION_BROKEN: "SESSION_BROKEN",
  UI_CHANGED: "UI_CHANGED",
  PROMPT_SEND_FAILED: "PROMPT_SEND_FAILED",
  GENERATION_TIMEOUT: "GENERATION_TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",
  NETWORK_ERROR: "NETWORK_ERROR",
  ATTACHMENT_FAILED: "ATTACHMENT_FAILED",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  UNKNOWN_UI_STATE: "UNKNOWN_UI_STATE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type BrokerErrorCodeType =
  (typeof BrokerErrorCode)[keyof typeof BrokerErrorCode];

export interface ErrorArtifacts {
  screenshot?: string;
  htmlSnapshot?: string;
}

/** Normalized error returned to API clients and MCP layer. */
export interface BrokerError {
  ok: false;
  code: BrokerErrorCodeType;
  message: string;
  lastUiState?: string;
  artifacts?: ErrorArtifacts;
}

export function isBrokerError(value: unknown): value is BrokerError {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as BrokerError).ok === false &&
    "code" in value
  );
}
