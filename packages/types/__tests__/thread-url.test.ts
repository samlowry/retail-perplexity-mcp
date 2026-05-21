import { describe, expect, it } from "vitest";
import { normalizeChatId } from "../src/thread-url.js";

describe("normalizeChatId", () => {
  it("passes through full URL", () => {
    const url = "https://www.perplexity.ai/search/abbc8f96-2fbf-415d-a76c-f18b5a95848e";
    expect(normalizeChatId(url)).toBe(url);
  });

  it("builds URL from slug", () => {
    expect(normalizeChatId("abbc8f96-2fbf-415d-a76c-f18b5a95848e")).toBe(
      "https://www.perplexity.ai/search/abbc8f96-2fbf-415d-a76c-f18b5a95848e",
    );
  });
});
