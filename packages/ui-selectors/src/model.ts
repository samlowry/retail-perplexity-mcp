import type { Page } from "playwright";
import type { SubmitFormContext } from "@pdb/types";

/** Model/mode picker (best-effort; UI varies). */
export function getModelSelector(page: Page) {
  return page.getByRole("button", { name: /model|pro|sonar|claude|gpt/i }).first();
}

/** Map toggle attributes to on/off when present. */
async function readToggleState(
  locator: ReturnType<Page["getByRole"]>,
): Promise<boolean | null> {
  const pressed = await locator.getAttribute("aria-pressed").catch(() => null);
  const checked = await locator.getAttribute("aria-checked").catch(() => null);
  if (pressed === "true" || checked === "true") return true;
  if (pressed === "false" || checked === "false") return false;
  const dataState = await locator.getAttribute("data-state").catch(() => null);
  if (dataState === "on" || dataState === "checked") return true;
  if (dataState === "off" || dataState === "unchecked") return false;
  return null;
}

/**
 * Read model name and reasoning on/off from the compose form before send (best-effort).
 */
export async function readSubmitFormContext(page: Page): Promise<SubmitFormContext> {
  let submitModel: string | null = null;
  let submitReasoningEnabled: boolean | null = null;

  const modelButton = getModelSelector(page);
  if (await modelButton.isVisible().catch(() => false)) {
    const label = (await modelButton.innerText().catch(() => "")).trim();
    if (label.length > 0) {
      submitModel = label.replace(/\s+/g, " ");
    }
  }

  const reasoningSwitch = page.getByRole("switch", { name: /reasoning|thinking/i }).first();
  if (await reasoningSwitch.isVisible().catch(() => false)) {
    submitReasoningEnabled = await readToggleState(reasoningSwitch);
  } else {
    const reasoningButton = page.getByRole("button", { name: /reasoning|thinking/i }).first();
    if (await reasoningButton.isVisible().catch(() => false)) {
      submitReasoningEnabled = await readToggleState(reasoningButton);
    }
  }

  return { submitModel, submitReasoningEnabled };
}
