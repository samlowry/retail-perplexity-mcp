import type { Page } from "playwright";
import { type LocatorStrategy, resolveVisibleLocator } from "./locator.js";

export const fileInputStrategies: LocatorStrategy[] = [
  {
    name: "file-input",
    resolve: (page) => page.locator('input[type="file"]'),
  },
];

export async function getFileInput(page: Page) {
  return resolveVisibleLocator(page, fileInputStrategies, 3_000);
}
