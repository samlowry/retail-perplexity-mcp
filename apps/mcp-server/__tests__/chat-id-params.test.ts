import { describe, expect, it } from "vitest";
import { resolveChatIdInput } from "../src/chat-id-params.js";

describe("resolveChatIdInput", () => {
  it("prefers chat_id", () => {
    const r = resolveChatIdInput(
      { chat_id: "https://www.perplexity.ai/search/abc", thread_url: "https://other" },
      "perplexity_status",
    );
    expect(r).toEqual({ ok: true, chatId: "https://www.perplexity.ai/search/abc" });
  });

  it("accepts thread_url alias", () => {
    const url = "https://www.perplexity.ai/search/113d6281-dc5d-4d3e-9c58-60ba4af53b28";
    const r = resolveChatIdInput({ thread_url: url }, "perplexity_status");
    expect(r).toEqual({ ok: true, chatId: url });
  });

  it("fails when both missing", () => {
    const r = resolveChatIdInput({}, "perplexity_status");
    expect(r.ok).toBe(false);
  });
});
