import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  BrokerNetworkError,
  BrokerRequestError,
  brokerFetch,
  brokerHealth,
  formatAnswer,
  formatTimingsMs,
  parseBrokerErrorBody,
  toAgentErrorCode,
  type ThreadStatusSuccess,
} from "./broker-client.js";

const SESSION_ID = "default";

/** MCP tools return JSON in text content. */
type AgentToolSuccess = {
  ok: true;
  thread_url: string;
  status: "running" | "completed" | "error";
  result?: string;
  error_message?: string;
  visible_chars?: number;
  sources?: NonNullable<ThreadStatusSuccess["answer"]>["sources"];
  timings_ms?: Record<string, number>;
  code?: string;
  last_ui_state?: string;
};

type AgentToolFailure = {
  ok: false;
  code: string;
  message: string;
  thread_url?: string;
};

function agentJsonContent(payload: AgentToolSuccess | AgentToolFailure) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

async function ensureBrokerHealthy(): Promise<AgentToolFailure | null> {
  const healthy = await brokerHealth();
  if (!healthy) {
    return {
      ok: false,
      code: "BROKER_OFFLINE",
      message: "Broker is not reachable or /health reported down. Start with pnpm dev:broker.",
    };
  }
  return null;
}

function failureFromError(error: unknown, threadUrl?: string): AgentToolFailure {
  if (error instanceof BrokerNetworkError) {
    return { ok: false, code: "BROKER_OFFLINE", message: error.message, thread_url: threadUrl };
  }
  if (error instanceof BrokerRequestError) {
    const brokerError = parseBrokerErrorBody(error.body);
    const code = toAgentErrorCode(brokerError?.code);
    const message =
      brokerError?.message ??
      (typeof error.body === "object" &&
      error.body !== null &&
      "message" in error.body &&
      typeof (error.body as { message: unknown }).message === "string"
        ? (error.body as { message: string }).message
        : "Request failed");
    return { ok: false, code, message, thread_url: threadUrl };
  }
  return {
    ok: false,
    code: "FAILED",
    message: error instanceof Error ? error.message : String(error),
    thread_url: threadUrl,
  };
}

function statusPayloadFromBroker(
  result: ThreadStatusSuccess,
  format: "markdown" | "text",
): AgentToolSuccess {
  const base = {
    ok: true as const,
    thread_url: result.threadUrl,
    visible_chars: result.visibleChars,
    last_ui_state: result.lastUiState,
  };

  if (result.status === "running") {
    return { ...base, status: "running" };
  }

  if (result.status === "error" && result.error) {
    return {
      ...base,
      status: "error",
      code: toAgentErrorCode(result.error.code),
      error_message: result.error.message,
    };
  }

  if (!result.answer) {
    return {
      ...base,
      status: "error",
      code: "FAILED",
      error_message: "Completed without an answer payload",
    };
  }

  return {
    ...base,
    status: "completed",
    result: formatAnswer(result.answer, format),
    sources: result.answer.sources?.length ? result.answer.sources : undefined,
    timings_ms: formatTimingsMs(result.answer.timings),
    visible_chars: result.answer.answerText.length,
  };
}

const questionSchema = z.string().min(1);
const newChatSchema = z.boolean().optional().default(false);
const formatSchema = z.enum(["markdown", "text"]).optional().default("markdown");
const threadUrlSchema = z.string().url();

const server = new McpServer({
  name: "perplexity-desktop-broker",
  version: "0.3.0",
});

server.tool(
  "perplexity_submit",
  "Send a question to Perplexity. Returns thread_url when the prompt is submitted (use as task id for perplexity_status). Does not wait for the full answer.",
  {
    question: questionSchema,
    new_chat: newChatSchema,
    format: formatSchema,
  },
  async ({ question, new_chat, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

    try {
      const result = await brokerFetch<{ ok: true; threadUrl: string }>("/chat/send", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SESSION_ID,
          text: question,
          newThread: new_chat,
          responseFormat: format,
        }),
      });

      return agentJsonContent({
        ok: true,
        thread_url: result.threadUrl,
        status: "running",
      });
    } catch (error) {
      return agentJsonContent(failureFromError(error));
    }
  },
);

server.tool(
  "perplexity_status",
  "Check a submitted task by thread_url. Opens the Perplexity thread if needed. status: running | completed | error; result and error_message when applicable; visible_chars for progress while running.",
  {
    thread_url: threadUrlSchema,
    format: formatSchema,
  },
  async ({ thread_url, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

    try {
      const result = await brokerFetch<ThreadStatusSuccess>("/thread/status", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SESSION_ID,
          threadUrl: thread_url,
          responseFormat: format,
        }),
      });

      return agentJsonContent(statusPayloadFromBroker(result, format));
    } catch (error) {
      return agentJsonContent(failureFromError(error, thread_url));
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
