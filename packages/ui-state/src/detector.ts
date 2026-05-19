import type { Page } from "playwright";
import { checkAuthState } from "@pdb/ui-selectors";
import { UiState, type UiDetectionResult, type UiStateType } from "./types.js";

let lastKnownState: UiStateType = UiState.UNKNOWN;

export function getLastKnownUiState(): UiStateType {
  return lastKnownState;
}

/**
 * Detect current Perplexity page UI state from DOM heuristics.
 */
export async function detectUiState(page: Page): Promise<UiDetectionResult> {
  const bodyText = await page.locator("body").innerText().catch(() => "");

  if (/rate limit|too many requests/i.test(bodyText)) {
    lastKnownState = UiState.RATE_LIMITED;
    return { state: UiState.RATE_LIMITED };
  }

  if (/network error|failed to load|something went wrong/i.test(bodyText)) {
    lastKnownState = UiState.NETWORK_ERROR;
    return { state: UiState.NETWORK_ERROR };
  }

  const auth = await checkAuthState(page);
  if (!auth.loggedIn) {
    lastKnownState = UiState.AUTH_EXPIRED;
    return { state: UiState.AUTH_EXPIRED, detail: auth.reason };
  }

  const dialogVisible = await page
    .getByRole("dialog")
    .first()
    .isVisible()
    .catch(() => false);
  if (dialogVisible) {
    lastKnownState = UiState.CONFIRMATION_DIALOG;
    return { state: UiState.CONFIRMATION_DIALOG };
  }

  const uploading = await page
    .locator('[class*="upload"], [aria-label*="upload"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (uploading && /uploading|processing file/i.test(bodyText)) {
    lastKnownState = UiState.FILE_UPLOADING;
    return { state: UiState.FILE_UPLOADING };
  }

  const stopVisible = await page
    .getByRole("button", { name: /stop/i })
    .first()
    .isVisible()
    .catch(() => false);
  if (stopVisible) {
    lastKnownState = UiState.GENERATING;
    return { state: UiState.GENERATING };
  }

  const answerVisible = await page
    .locator('[data-role="assistant"], .prose, article')
    .last()
    .isVisible()
    .catch(() => false);

  const promptVisible = await page
    .getByPlaceholder(/ask anything|search|follow-up/i)
    .first()
    .isVisible()
    .catch(() => false);

  if (answerVisible && promptVisible) {
    const streaming = await page
      .locator('[class*="streaming"], [data-streaming="true"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (streaming) {
      lastKnownState = UiState.STREAMING_PARTIAL;
      return { state: UiState.STREAMING_PARTIAL };
    }
    lastKnownState = UiState.COMPLETE;
    return { state: UiState.COMPLETE };
  }

  if (promptVisible) {
    lastKnownState = UiState.READY;
    return { state: UiState.READY };
  }

  lastKnownState = UiState.UNKNOWN;
  return { state: UiState.UNKNOWN };
}
