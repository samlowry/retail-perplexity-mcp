import type { Page } from "playwright";

/** Sidebar thread list items (best-effort). */
export function getThreadListItems(page: Page) {
  return page.locator('[data-testid*="thread"], [class*="thread"]').filter({
    has: page.locator("a, button"),
  });
}
