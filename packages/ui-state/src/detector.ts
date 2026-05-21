import type { Page } from "playwright";
import {
  answerStrategies,
  checkAuthState,
  isAnyStrategyVisible,
  promptInputStrategies,
  resolveVisibleLocator,
} from "@pdb/ui-selectors";
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

  const auth = await checkAuthState(page);
  if (!auth.loggedIn) {
    lastKnownState = UiState.AUTH_EXPIRED;
    return { state: UiState.AUTH_EXPIRED, detail: auth.reason };
  }

  const answerBlock = await resolveVisibleLocator(page, answerStrategies, 8_000);
  const answerVisible = answerBlock !== null;
  const promptVisible = await isAnyStrategyVisible(page, promptInputStrategies);

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

  if (answerVisible) {
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
