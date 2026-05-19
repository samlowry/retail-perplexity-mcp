import type { Page } from "playwright";

/** Model/mode picker (best-effort; UI varies). */
export function getModelSelector(page: Page) {
  return page.getByRole("button", { name: /model|pro|sonar/i }).first();
}
