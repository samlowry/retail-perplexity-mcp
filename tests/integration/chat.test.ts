import { describe, expect, it } from "vitest";

const BROKER = `http://${process.env.BROKER_HOST ?? "127.0.0.1"}:${process.env.BROKER_PORT ?? "3317"}`;

/**
 * Live integration: requires logged-in profile and `pnpm dev:broker`.
 * Run: pnpm test:live
 */
describe.skip("live chat @live", () => {
  it("submit returns submitContext; completed poll returns preparedUsing", async () => {
    const send = await fetch(`${BROKER}/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "default",
        text: "Reply with one word: ok",
        responseFormat: "text",
      }),
    });
    expect(send.ok).toBe(true);
    const sendBody = (await send.json()) as {
      submitContext: { submitModel: string | null; submitReasoningEnabled: boolean | null };
      chatId: string;
    };
    expect(sendBody.chatId).toBeTruthy();
    expect(sendBody.submitContext).toBeDefined();

    const status = await fetch(`${BROKER}/thread/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "default",
        chatId: sendBody.chatId,
        responseFormat: "text",
      }),
    });
    expect(status.ok).toBe(true);
    const statusBody = (await status.json()) as {
      status: string;
      answer?: { preparedUsing: string | null };
    };
    if (statusBody.status === "completed") {
      expect(statusBody.answer?.preparedUsing !== undefined).toBe(true);
    }
  });
});
