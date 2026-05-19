import type { Page } from "playwright";

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

  const promptVisible = await page
    .getByPlaceholder(/ask anything|search|follow-up/i)
    .first()
    .isVisible()
    .catch(() => false);
  if (promptVisible) {
    return { loggedIn: true, reason: "prompt_visible" };
  }

  const textboxVisible = await page
    .getByRole("textbox")
    .first()
    .isVisible()
    .catch(() => false);
  if (textboxVisible) {
    return { loggedIn: true, reason: "textbox_visible" };
  }

  return { loggedIn: false, reason: "unknown" };
}
