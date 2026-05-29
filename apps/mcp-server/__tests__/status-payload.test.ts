import { describe, expect, it } from "vitest";
import { statusPayloadFromBroker } from "../src/status-payload.js";
import type { ThreadStatusSuccess } from "../src/broker-client.js";

describe("statusPayloadFromBroker", () => {
  it("includes prepared_using only when completed", () => {
    const running: ThreadStatusSuccess = {
      ok: true,
      chatId: "https://www.perplexity.ai/search/abc",
      status: "running",
      visibleChars: 0,
    };
    const runningPayload = statusPayloadFromBroker(running, "markdown");
    expect(runningPayload.prepared_using).toBeUndefined();
    expect(runningPayload.submit_model).toBeUndefined();

    const completed: ThreadStatusSuccess = {
      ok: true,
      chatId: "https://www.perplexity.ai/search/abc",
      status: "completed",
      answer: {
        status: "completed",
        answerText: "Hello",
        preparedUsing: "Claude Sonnet 4.6 Thinking",
        sources: [],
        timings: { queueMs: 0, sendMs: 0, generationMs: 0, extractMs: 0 },
      },
    };
    const donePayload = statusPayloadFromBroker(completed, "markdown");
    expect(donePayload.prepared_using).toBe("Claude Sonnet 4.6 Thinking");
  });
});
