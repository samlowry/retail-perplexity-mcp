import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrokerErrorCode, ThreadTaskStatus } from "@pdb/types";
import { createServer } from "../src/app.js";
import { resetService } from "../src/service-holder.js";

const mockSubmitChat = vi.fn();
const mockGetThreadStatus = vi.fn();
const mockEnsureSession = vi.fn();

vi.mock("@pdb/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pdb/core")>();
  return {
    ...actual,
    BrokerService: class {
      submitChat = mockSubmitChat;
      getThreadStatus = mockGetThreadStatus;
      ensureSession = mockEnsureSession;
      getHealth = () => ({ ok: true, broker: "up", browser: "down" });
      newThread = vi.fn();
      cancel = vi.fn();
      upload = vi.fn();
    },
    loadConfig: actual.loadConfig,
  };
});

describe("broker routes", () => {
  beforeEach(() => {
    resetService();
    vi.clearAllMocks();
  });

  it("POST /chat/send returns submitContext", async () => {
    mockSubmitChat.mockResolvedValue({
      chatId: "https://www.perplexity.ai/search/abc",
      promptSuffixApplied: true,
      submitContext: {
        submitModel: "Sonar",
        submitReasoningEnabled: true,
      },
    });

    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/chat/send",
      payload: { sessionId: "default", text: "hi" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.submitContext.submitModel).toBe("Sonar");
    expect(body.submitContext.submitReasoningEnabled).toBe(true);
  });

  it("POST /thread/status completed includes preparedUsing on answer", async () => {
    mockGetThreadStatus.mockResolvedValue({
      ok: true,
      chatId: "https://www.perplexity.ai/search/abc",
      status: ThreadTaskStatus.COMPLETED,
      answer: {
        status: "completed",
        answerText: "Answer body",
        preparedUsing: "Claude Sonnet 4.6 Thinking",
        sources: [],
        timings: { queueMs: 0, sendMs: 0, generationMs: 0, extractMs: 0 },
      },
    });

    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/thread/status",
      payload: {
        sessionId: "default",
        chatId: "https://www.perplexity.ai/search/abc",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().answer.preparedUsing).toBe("Claude Sonnet 4.6 Thinking");
  });

  it("POST /session/ensure returns 401 on auth error", async () => {
    mockEnsureSession.mockResolvedValue({
      ok: false,
      code: BrokerErrorCode.AUTH_REQUIRED,
      message: "Login required",
    });

    const app = await createServer();
    const response = await app.inject({
      method: "POST",
      url: "/session/ensure",
      payload: { sessionId: "default" },
    });

    expect(response.statusCode).toBe(401);
  });
});
