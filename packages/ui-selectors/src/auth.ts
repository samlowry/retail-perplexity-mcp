import type { Page } from "playwright";
import { answerStrategies } from "./answer.js";
import { isPromptInputVisible } from "./input.js";
import { resolveVisibleLocator } from "./locator.js";

export interface AuthCheckResult {
  loggedIn: boolean;
  reason: string;
}

/**
 * Heuristic login detection without automating credentials.
 * Thread/search pages often hide the home prompt while answers are visible.
 */
export async function checkAuthState(page: Page): Promise<AuthCheckResult> {
  const url = page.url();
  if (/login|sign-in|auth/i.test(url)) {
    return { loggedIn: false, reason: "auth_url" };
  }

  const signInVisible = await page
    .getByRole("button", { name: /sign in|log in/i })
    .first()
    .isVisible()
    .catch(() => false);
  if (signInVisible) {
    return { loggedIn: false, reason: "sign_in_button" };
  }

  if (await isPromptInputVisible(page)) {
    return { loggedIn: true, reason: "prompt_visible" };
  }

  const answerBlock = await resolveVisibleLocator(page, answerStrategies, 8_000);
  if (answerBlock) {
    return { loggedIn: true, reason: "answer_visible" };
  }

  const stopVisible = await page
    .getByRole("button", { name: /stop/i })
    .first()
    .isVisible()
    .catch(() => false);
  if (stopVisible) {
    return { loggedIn: true, reason: "generating" };
  }

  // Thread opened after a successful send; home prompt may not be in DOM yet.
  if (/perplexity\.ai\/search\//i.test(url)) {
    return { loggedIn: true, reason: "thread_url" };
  }

  return { loggedIn: false, reason: "unknown" };
}
