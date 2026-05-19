import type { Page } from "playwright";
import { type LocatorStrategy, resolveVisibleLocator } from "./locator.js";

export const answerStrategies: LocatorStrategy[] = [
  {
    name: "assistant-message",
    resolve: (page) => page.locator('[data-role="assistant"], [class*="assistant"]').last(),
  },
  {
    name: "prose-answer",
    resolve: (page) => page.locator(".prose, [class*='markdown']").last(),
  },
  {
    name: "article-last",
    resolve: (page) => page.locator("article").last(),
  },
];

/** Locate the last assistant answer block. */
export async function getLastAnswerBlock(page: Page) {
  return resolveVisibleLocator(page, answerStrategies, 10_000);
}
