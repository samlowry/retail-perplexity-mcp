import type { Page } from "playwright-core";
import { getPromptInput, getStopButton, getSubmitButton } from "@pdb/ui-selectors";
import { UiState, waitForUiState } from "@pdb/ui-state";
import { BrokerErrorCode } from "@pdb/types";
import { captureArtifacts } from "./artifacts.js";
export async function sendPrompt(page: Page, text: string): Promise<void> {
  const input = await getPromptInput(page);
  if (!input) {
    throw {
      ok: false,
      code: BrokerErrorCode.UI_CHANGED,
      message: "Prompt input not found",
    };
  }

  await input.locator.fill(text);
  const submit = await getSubmitButton(page);
  if (submit) {
    await submit.locator.click();
  } else {
    await input.locator.press("Enter");
  }
}

export async function waitForCompletion(
  page: Page,
  timeoutMs: number,
  artifactsDir: string,
): Promise<void> {
  const generating = await waitForUiState(page, UiState.GENERATING, 10_000);
  if (!generating.ok) {
    const complete = await waitForUiState(
      page,
      [UiState.COMPLETE, UiState.READY],
      5_000,
    );
    if (complete.ok) return;
  }

  const done = await waitForUiState(
    page,
    [UiState.COMPLETE, UiState.READY],
    timeoutMs,
  );

  if (!done.ok) {
    const artifacts = await captureArtifacts(page, artifactsDir, "timeout");
    throw {
      ok: false,
      code: BrokerErrorCode.GENERATION_TIMEOUT,
      message: `Generation timed out in state ${done.state}`,
      lastUiState: done.state,
      artifacts: {
        screenshot: artifacts.screenshot,
        htmlSnapshot: artifacts.htmlSnapshot,
      },
    };
  }
}

export async function cancelGeneration(page: Page): Promise<boolean> {
  const stop = await getStopButton(page);
  if (!stop) return false;
  await stop.locator.click();
  return true;
}
