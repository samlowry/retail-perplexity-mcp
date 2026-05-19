import type { Page } from "playwright";
import { getNewThreadButton } from "@pdb/ui-selectors";

export async function newThread(page: Page): Promise<void> {
  const btn = await getNewThreadButton(page);
  if (btn) {
    await btn.locator.click();
    return;
  }
  await page.keyboard.press("Control+K").catch(() => undefined);
}
