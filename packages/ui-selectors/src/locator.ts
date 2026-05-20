import type { Locator, Page } from "playwright";

export interface LocatorStrategy {
  name: string;
  resolve: (page: Page) => Locator;
}

/**
 * Resolves a locator using primary strategy, then fallbacks.
 * Returns null if none are visible within timeout.
 */
export async function resolveVisibleLocator(
  page: Page,
  strategies: LocatorStrategy[],
  timeoutMs = 5_000,
): Promise<{ locator: Locator; strategy: string } | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const strategy of strategies) {
      const locator = strategy.resolve(page);
      if (await locator.first().isVisible().catch(() => false)) {
        return { locator: locator.first(), strategy: strategy.name };
      }
    }
    await page.waitForTimeout(200);
  }

  return null;
}

/**
 * Returns true if any strategy resolves to a visible element (single pass, no polling).
 */
export async function isAnyStrategyVisible(
  page: Page,
  strategies: LocatorStrategy[],
): Promise<boolean> {
  for (const strategy of strategies) {
    const locator = strategy.resolve(page);
    if (await locator.first().isVisible().catch(() => false)) {
      return true;
    }
  }
  return false;
}
