import type { Locator, Page } from "playwright-core";
import { getPromptInput, getStopButton, getSubmitButton } from "@pdb/ui-selectors";
import { UiState, waitForUiState } from "@pdb/ui-state";
import { BrokerErrorCode } from "@pdb/types";
import { captureArtifacts } from "./artifacts.js";

/**
 * Set Lexical prompt text and verify the editor retained head/tail (fill() alone often drops blocks after HR-like lines).
 */
async function fillPromptInput(page: Page, locator: Locator, text: string): Promise<void> {
  const headMarker = text.slice(0, Math.min(48, text.length));
  const tailMarker = text.slice(-Math.min(48, text.length));

  const readInnerText = async (): Promise<string> =>
    locator.evaluate((el) => (el as { innerText?: string }).innerText ?? "");

  await locator.click();
  await locator.fill(text);
  let synced = await readInnerText();
  const missingTail = tailMarker.length > 8 && !synced.includes(tailMarker);
  if (!synced.includes(headMarker) || missingTail) {
    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await locator.click();
    await page.keyboard.press(`${mod}+KeyA`);
    await page.keyboard.press("Backspace");
    await page.keyboard.insertText(text);
    synced = await readInnerText();
  }

  const stillMissingTail = tailMarker.length > 8 && !synced.includes(tailMarker);
  if (!synced.includes(headMarker) || stillMissingTail) {
    throw {
      ok: false,
      code: BrokerErrorCode.PROMPT_SEND_FAILED,
      message: `Prompt input did not accept full text (editor ${synced.length} chars, expected ${text.length})`,
    };
  }
}

/**
 * Submit the prompt without targeting the Submit button hit box.
 * Perplexity's fixed "Set up Computer" promo (bottom-right) is not closable but
 * Playwright's actionability check treats it as intercepting pointer events on Submit.
 */
async function submitPrompt(
  page: Page,
  inputLocator: Locator,
  submit: Awaited<ReturnType<typeof getSubmitButton>>,
): Promise<void> {
  await inputLocator.focus();
  await inputLocator.press("Enter");

  const started = await waitForUiState(
    page,
    [UiState.GENERATING, UiState.COMPLETE, UiState.READY],
    4_000,
  );
  if (started.ok) {
    return;
  }

  if (submit) {
    await submit.locator.click({ force: true, timeout: 5_000 });
  }
}

export async function sendPrompt(page: Page, text: string): Promise<void> {
  const input = await getPromptInput(page);
  if (!input) {
    throw {
      ok: false,
      code: BrokerErrorCode.UI_CHANGED,
      message: "Prompt input not found",
    };
  }

  await fillPromptInput(page, input.locator, text);
  const submit = await getSubmitButton(page);
  await submitPrompt(page, input.locator, submit);
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
