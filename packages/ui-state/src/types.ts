export const UiState = {
  READY: "ready",
  GENERATING: "generating",
  COMPLETE: "complete",
  NETWORK_ERROR: "network_error",
  RATE_LIMITED: "rate_limited",
  AUTH_EXPIRED: "auth_expired",
  CONFIRMATION_DIALOG: "confirmation_dialog",
  FILE_UPLOADING: "file_uploading",
  STREAMING_PARTIAL: "streaming_partial",
  UNKNOWN: "unknown",
} as const;

export type UiStateType = (typeof UiState)[keyof typeof UiState];

export interface UiDetectionResult {
  state: UiStateType;
  detail?: string;
}
