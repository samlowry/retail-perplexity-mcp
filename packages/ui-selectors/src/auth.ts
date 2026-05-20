import type { Page } from "playwright";
import { isPromptInputVisible } from "./input.js";

export interface AuthCheckResult {
  loggedIn: boolean;
  reason: string;
}

/**
 * Heuristic login detection without automating credentials.
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

  return { loggedIn: false, reason: "unknown" };
}
