import type { Page } from "playwright";
import { type LocatorStrategy, resolveVisibleLocator } from "./locator.js";

export const submitStrategies: LocatorStrategy[] = [
  {
    name: "submit-arrow",
    resolve: (page) => page.getByRole("button", { name: /submit|send|arrow/i }),
  },
  {
    name: "submit-icon",
    resolve: (page) => page.locator('button[type="submit"]').last(),
  },
];

export const stopStrategies: LocatorStrategy[] = [
  {
    name: "stop-generating",
    resolve: (page) => page.getByRole("button", { name: /stop/i }),
  },
];

export const newThreadStrategies: LocatorStrategy[] = [
  {
    name: "new-thread",
    resolve: (page) => page.getByRole("button", { name: /new thread|new chat/i }),
  },
  {
    name: "new-thread-link",
    resolve: (page) => page.getByRole("link", { name: /new thread|new chat/i }),
  },
];

export async function getSubmitButton(page: Page) {
  return resolveVisibleLocator(page, submitStrategies);
}

export async function getStopButton(page: Page) {
  return resolveVisibleLocator(page, stopStrategies, 2_000);
}

export async function getNewThreadButton(page: Page) {
  return resolveVisibleLocator(page, newThreadStrategies);
}
