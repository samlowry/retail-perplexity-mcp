import { UiState, type UiStateType } from "./types.js";

/** Map UI states to broker-facing error hints. */
export function isErrorUiState(state: UiStateType): boolean {
  return (
    state === UiState.NETWORK_ERROR ||
    state === UiState.RATE_LIMITED ||
    state === UiState.AUTH_EXPIRED
  );
}
