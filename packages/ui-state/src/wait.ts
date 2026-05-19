import type { Page } from "playwright";
import { detectUiState } from "./detector.js";
import type { UiStateType } from "./types.js";

/**
 * Poll UI state until target or timeout (no arbitrary sleep loops).
 */
export async function waitForUiState(
  page: Page,
  target: UiStateType | UiStateType[],
  timeoutMs: number,
): Promise<{ ok: boolean; state: UiStateType }> {
  const targets = Array.isArray(target) ? target : [target];
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { state } = await detectUiState(page);
    if (targets.includes(state)) {
      return { ok: true, state };
    }
    await page.waitForTimeout(250);
  }

  const { state } = await detectUiState(page);
  return { ok: false, state };
}
