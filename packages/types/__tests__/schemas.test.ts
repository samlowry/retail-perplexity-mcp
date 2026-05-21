import { describe, expect, it } from "vitest";
import {
  chatSendBodySchema,
  sessionEnsureBodySchema,
  threadStatusBodySchema,
} from "../src/schemas/index.js";

describe("sessionEnsureBodySchema", () => {
  it("defaults sessionId", () => {
    const parsed = sessionEnsureBodySchema.parse({});
    expect(parsed.sessionId).toBe("default");
  });
});

describe("chatSendBodySchema", () => {
  it("requires text", () => {
    expect(() => chatSendBodySchema.parse({ sessionId: "default" })).toThrow();
  });

  it("parses valid payload", () => {
    const parsed = chatSendBodySchema.parse({
      sessionId: "default",
      text: "hello",
    });
    expect(parsed.responseFormat).toBe("markdown");
  });
});

describe("threadStatusBodySchema", () => {
  const url = "https://www.perplexity.ai/search/113d6281-dc5d-4d3e-9c58-60ba4af53b28";

  it("accepts chatId", () => {
    const parsed = threadStatusBodySchema.parse({
      sessionId: "default",
      chatId: url,
    });
    expect(parsed.chatId).toBe(url);
  });

  it("accepts legacy threadUrl", () => {
    const parsed = threadStatusBodySchema.parse({
      sessionId: "default",
      threadUrl: url,
    });
    expect(parsed.chatId).toBe(url);
  });
});
