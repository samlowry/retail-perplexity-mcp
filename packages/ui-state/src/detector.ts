import type { Page } from "playwright";
import {
  answerStrategies,
  checkAuthState,
  getLastAnswerBlock,
  getStopButton,
  isAnyStrategyVisible,
  promptInputStrategies,
  resolveVisibleLocator,
} from "@pdb/ui-selectors";
import { UiState, type UiDetectionResult, type UiStateType } from "./types.js";

let lastKnownState: UiStateType = UiState.UNKNOWN;

export function getLastKnownUiState(): UiStateType {
  return lastKnownState;
}

const GENERATION_PLACEHOLDER = /^(thinking|searching|writing|reading sources|working)/i;

/**
 * True when Perplexity is producing a new answer (including follow-ups in a multi-turn thread).
 */
export async function isGenerationActive(page: Page): Promise<boolean> {
  const stop = await getStopButton(page);
  if (stop) {
    return true;
  }

  const stopByLabel = await page
    .locator('button[aria-label*="stop" i]')
    .first()
    .isVisible()
    .catch(() => false);
  if (stopByLabel) {
    return true;
  }

  const lastBlock = await getLastAnswerBlock(page);
  if (lastBlock) {
    const streamingInAnswer = await lastBlock.locator
      .locator('[class*="streaming"], [data-streaming="true"], [aria-busy="true"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (streamingInAnswer) {
      return true;
    }
    const answerText = (await lastBlock.locator.innerText().catch(() => "")).trim();
    if (GENERATION_PLACEHOLDER.test(answerText)) {
      return true;
    }
  }

  const streamingAnywhere = await page
    .locator('[class*="streaming"], [data-streaming="true"]')
    .first()
    .isVisible()
    .catch(() => false);
  return streamingAnywhere;
}

/**
 * Detect current Perplexity page UI state from DOM heuristics.
 */
export async function detectUiState(page: Page): Promise<UiDetectionResult> {
  const bodyText = await page.locator("body").innerText().catch(() => "");

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

  if (await isGenerationActive(page)) {
    lastKnownState = UiState.GENERATING;
    return { state: UiState.GENERATING };
  }

  // After generation signals are gone: avoid matching "rate limiting" inside long answers while streaming.
  if (/rate limit exceeded|too many requests/i.test(bodyText)) {
    lastKnownState = UiState.RATE_LIMITED;
    return { state: UiState.RATE_LIMITED };
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
