import type { Page } from "playwright";
import { type LocatorStrategy, resolveVisibleLocator } from "./locator.js";

export const promptInputStrategies: LocatorStrategy[] = [
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
