import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Page } from "playwright";

export interface CaptureResult {
  screenshot?: string;
  htmlSnapshot?: string;
}

/** Save screenshot and HTML snapshot on failure. */
export async function captureArtifacts(
  page: Page,
  artifactsDir: string,
  prefix: string,
): Promise<CaptureResult> {
  await mkdir(artifactsDir, { recursive: true });
  const id = randomUUID().slice(0, 8);
  const screenshotPath = join(artifactsDir, `${prefix}-${id}.png`);
  const htmlPath = join(artifactsDir, `${prefix}-${id}.html`);

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const html = await page.content().catch(() => "");
  if (html) await writeFile(htmlPath, html, "utf-8");

  return {
    screenshot: screenshotPath,
    htmlSnapshot: html ? htmlPath : undefined,
  };
}
