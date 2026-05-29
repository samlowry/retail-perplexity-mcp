import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  BrokerNetworkError,
  BrokerRequestError,
  brokerFetch,
  parseBrokerErrorBody,
  toAgentErrorCode,
  type ChatSubmitSuccess,
  type ThreadStatusSuccess,
} from "./broker-client.js";
import { statusPayloadFromBroker, type AgentToolSuccess } from "./status-payload.js";
import { MCP_VERSION } from "./version.js";

const SESSION_ID = "default";

type AgentToolFailure = {
  ok: false;
  code: string;
  message: string;
  chat_id?: string;
};

function agentJsonContent(payload: AgentToolSuccess | AgentToolFailure) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

function failureFromError(error: unknown, chatId?: string): AgentToolFailure {
  if (error instanceof BrokerNetworkError) {
    return { ok: false, code: "BROKER_OFFLINE", message: error.message, chat_id: chatId };
  }
  if (error instanceof BrokerRequestError) {
    const brokerError = parseBrokerErrorBody(error.body);
    const code = toAgentErrorCode(brokerError?.code);
    let message = brokerError?.message;
    if (!message && typeof error.body === "string") {
      message = error.body;
    }
    if (!message && error.status === 400) {
      message = "Invalid request (chat_id is required for perplexity_get_answer)";
    }
    if (!message) {
      message =
        typeof error.body === "object" &&
        error.body !== null &&
        "message" in error.body &&
        typeof (error.body as { message: unknown }).message === "string"
          ? (error.body as { message: string }).message
          : "Request failed";
    }
    return { ok: false, code, message, chat_id: chatId };
  }
  return {
    ok: false,
    code: "FAILED",
    message: error instanceof Error ? error.message : String(error),
    chat_id: chatId,
  };
}

const POLL_SCHEDULE_HINT =
  "Poll perplexity_get_answer at 2, 3, 5, 10, 15, 20 min after submit (sleep between). visible_chars 0 for long stretches during reasoning is normal.";

const questionSchema = z.string().min(1);
const chatIdSchema = z.string().min(1).optional();
const chatIdRequiredSchema = z.string().min(1);
const formatSchema = z.enum(["markdown", "text"]).optional().default("markdown");

const server = new McpServer({
  name: "perplexity-desktop-broker",
  version: MCP_VERSION,
});

server.tool(
  "perplexity_submit_question",
  `Submit a question to Perplexity only — does NOT return an answer. Returns chat_id, submit_model, submit_reasoning_enabled (compose form at send), status running. Call perplexity_get_answer until completed. ${POLL_SCHEDULE_HINT} One in-flight per session (BUSY on overlap).`,
  {
    question: questionSchema,
    chat_id: chatIdSchema,
    format: formatSchema,
  },
  async ({ question, chat_id, format }) => {
    try {
      console.error(
        `[perplexity-broker mcp ${MCP_VERSION}] submit question_chars=${question.length}`,
      );

      const result = await brokerFetch<ChatSubmitSuccess>("/chat/send", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SESSION_ID,
          text: question,
          chatId: chat_id,
          responseFormat: format,
        }),
      });

      return agentJsonContent({
        ok: true,
        mcp_version: MCP_VERSION,
        chat_id: result.chatId,
        status: "running",
        prompt_suffix_applied: result.promptSuffixApplied ?? false,
        submit_model: result.submitContext.submitModel,
        submit_reasoning_enabled: result.submitContext.submitReasoningEnabled,
        next_step: `Call perplexity_get_answer with this chat_id. ${POLL_SCHEDULE_HINT}`,
      });
    } catch (error) {
      return agentJsonContent(failureFromError(error, chat_id));
    }
  },
);

server.tool(
  "perplexity_get_answer",
  `Poll by chat_id. running = no result yet. completed includes result and prepared_using (from “Prepared using …”). ${POLL_SCHEDULE_HINT}`,
  {
    chat_id: chatIdRequiredSchema,
    format: formatSchema,
  },
  async ({ chat_id, format }) => {
    try {
      const result = await brokerFetch<ThreadStatusSuccess>("/thread/status",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: SESSION_ID,
            chatId: chat_id,
            responseFormat: format,
          }),
        },
      );

      return agentJsonContent(statusPayloadFromBroker(result, format));
    } catch (error) {
      return agentJsonContent(failureFromError(error, chat_id));
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
