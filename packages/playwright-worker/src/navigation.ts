import type { Page } from "playwright-core";

export async function openHome(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
}
