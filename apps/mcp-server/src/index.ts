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
  type ChatSendSuccess,
} from "./broker-client.js";

const SESSION_ID = "default";

type AgentSuccess = {
  ok: true;
  answer: string;
  sources?: ChatSendSuccess["answer"]["sources"];
  timings_ms?: Record<string, number>;
};

type AgentFailure = {
  ok: false;
  code: string;
  message: string;
};

function agentJsonContent(payload: AgentSuccess | AgentFailure) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

const server = new McpServer({
  name: "perplexity-desktop-broker",
  version: "0.1.0",
});

server.tool(
  "perplexity_ask",
  "Ask Perplexity a question. Browser session bootstrap and login checks run automatically.",
  {
    question: z.string().min(1),
    new_chat: z.boolean().optional().default(false),
    timeout_seconds: z.number().positive().optional().default(180),
    format: z.enum(["markdown", "text"]).optional().default("markdown"),
  },
  async ({ question, new_chat, timeout_seconds, format }) => {
    const healthy = await brokerHealth();
    if (!healthy) {
      return agentJsonContent({
        ok: false,
        code: "BROKER_OFFLINE",
        message: "Broker is not reachable or /health reported down. Start with pnpm dev:broker.",
      });
    }

    try {
      const result = await brokerFetch<ChatSendSuccess>("/chat/send", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SESSION_ID,
          text: question,
          newThread: new_chat,
          timeoutMs: timeout_seconds * 1000,
          wait: true,
          responseFormat: format,
        }),
      });

      const success: AgentSuccess = {
        ok: true,
        answer: formatAnswer(result.answer, format),
        sources: result.answer.sources?.length ? result.answer.sources : undefined,
        timings_ms: formatTimingsMs(result.answer.timings),
      };
      return agentJsonContent(success);
    } catch (error) {
      if (error instanceof BrokerNetworkError) {
        return agentJsonContent({
          ok: false,
          code: "BROKER_OFFLINE",
          message: error.message,
        });
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
        return agentJsonContent({ ok: false, code, message });
      }

      return agentJsonContent({
        ok: false,
        code: "FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
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
