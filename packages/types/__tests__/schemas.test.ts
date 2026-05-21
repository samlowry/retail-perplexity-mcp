import { describe, expect, it } from "vitest";
import { chatSendBodySchema, sessionEnsureBodySchema } from "../src/schemas/index.js";

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
