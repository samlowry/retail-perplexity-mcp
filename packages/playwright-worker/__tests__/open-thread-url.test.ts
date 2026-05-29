import { describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  openThreadUrl,
  ThreadOpenPolicy,
} from "../src/generation.js";

const THREAD =
  "https://www.perplexity.ai/search/abbc8f96-2fbf-4c8a-9c0a-111111111111";
const HOME = "https://www.perplexity.ai/";

function mockPage(currentUrl: string) {
  const reload = vi.fn(async () => undefined);
  const goto = vi.fn(async () => undefined);
  const waitForLoadState = vi.fn(async () => undefined);
  const page = {
    url: () => currentUrl,
    reload,
    goto,
    waitForLoadState,
  } as unknown as Page;
  return { page, reload, goto, waitForLoadState };
}

describe("openThreadUrl", () => {
  it("statusPoll on same URL reloads and does not goto", async () => {
    const { page, reload, goto } = mockPage(THREAD);
    await openThreadUrl(page, THREAD, ThreadOpenPolicy.StatusPoll);
    expect(reload).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });

  it("statusPoll on different URL gotos and does not reload", async () => {
    const { page, reload, goto } = mockPage(HOME);
    await openThreadUrl(page, THREAD, ThreadOpenPolicy.StatusPoll);
    expect(goto).toHaveBeenCalledWith(THREAD, { waitUntil: "domcontentloaded" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("followUpSubmit on same URL is a no-op", async () => {
    const { page, reload, goto } = mockPage(THREAD);
    await openThreadUrl(page, THREAD, ThreadOpenPolicy.FollowUpSubmit);
    expect(reload).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("followUpSubmit on different URL gotos only", async () => {
    const { page, reload, goto } = mockPage(HOME);
    await openThreadUrl(page, THREAD, ThreadOpenPolicy.FollowUpSubmit);
    expect(goto).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it("normalizes trailing slash and hash for same-URL detection", async () => {
    const { page, reload, goto } = mockPage(`${THREAD}/#section`);
    await openThreadUrl(page, THREAD, ThreadOpenPolicy.StatusPoll);
    expect(reload).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });
});
