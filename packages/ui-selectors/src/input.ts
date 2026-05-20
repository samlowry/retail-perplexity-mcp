import type { Page } from "playwright";
import {
  type LocatorStrategy,
  isAnyStrategyVisible,
  resolveVisibleLocator,
} from "./locator.js";

export const promptInputStrategies: LocatorStrategy[] = [
  {
    name: "ask-input-id",
    resolve: (page) => page.locator("#ask-input"),
  },
  {
    name: "aria-placeholder",
    resolve: (page) =>
      page.locator(
        '[aria-placeholder*="follow" i], [aria-placeholder*="anything" i], [aria-placeholder*="search" i]',
      ),
  },
  {
    name: "placeholder-ask",
    resolve: (page) => page.getByPlaceholder(/ask anything|search|follow-up/i),
  },
  {
    name: "role-textbox",
    resolve: (page) => page.getByRole("textbox"),
  },
  {
    name: "contenteditable",
    resolve: (page) => page.locator('[contenteditable="true"]').last(),
  },
];

/** Locate the main chat prompt input. */
export async function getPromptInput(page: Page) {
  return resolveVisibleLocator(page, promptInputStrategies);
}

/** True when the chat prompt input is visible (single-pass strategy check). */
export async function isPromptInputVisible(page: Page): Promise<boolean> {
  return isAnyStrategyVisible(page, promptInputStrategies);
}
