import type { Page } from "playwright";

const PREPARED_USING_RE =
  /Prepared\s+using\s+(.+?)(?:\s*[·•|]\s*|$)/i;

/**
 * Parse model label from a “Prepared using …” attribution string (unit-testable).
 */
export function parsePreparedUsingFromText(text: string): string | null {
  const match = PREPARED_USING_RE.exec(text);
  if (!match?.[1]) return null;
  const label = match[1].trim();
  return label.length > 0 ? label : null;
}

/**
 * Read “Prepared using …” attribution from the page near the last answer (best-effort).
 */
export async function extractPreparedUsing(page: Page): Promise<string | null> {
  const candidates = [
    page.getByText(/Prepared\s+using/i).first(),
    page.locator('[class*="attribution"], [data-testid*="attribution"]').first(),
  ];

  for (const locator of candidates) {
    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;
    const text = (await locator.innerText().catch(() => "")).trim();
    const parsed = parsePreparedUsingFromText(text);
    if (parsed) return parsed;
  }

  const bodyText = (await page.locator("body").innerText().catch(() => "")).slice(-4000);
  return parsePreparedUsingFromText(bodyText);
}
