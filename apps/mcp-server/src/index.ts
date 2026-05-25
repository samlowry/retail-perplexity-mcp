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
  type ChatSubmitSuccess,
  type ThreadStatusSuccess,
} from "./broker-client.js";
import { CHAT_OUTPUT_INSTRUCTION_SEPARATOR } from "@pdb/types";
import { MCP_VERSION } from "./version.js";

const SESSION_ID = "default";

/** MCP tools return JSON in text content. */
type AgentToolSuccess = {
  ok: true;
  mcp_version: string;
  chat_id: string;
  status: "running" | "completed" | "error";
  /** True when in-chat-only suffix was appended on submit (check mcp_version). */
  prompt_suffix_applied?: boolean;
  /** Required follow-up when status is running after submit. */
  next_step?: string;
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
  chat_id?: string;
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

function statusPayloadFromBroker(
  result: ThreadStatusSuccess,
  format: "markdown" | "text",
): AgentToolSuccess {
  const base = {
    ok: true as const,
    mcp_version: MCP_VERSION,
    chat_id: result.chatId,
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
const chatIdSchema = z.string().min(1).optional();
const chatIdRequiredSchema = z.string().min(1);
const formatSchema = z.enum(["markdown", "text"]).optional().default("markdown");

const server = new McpServer({
  name: "perplexity-desktop-broker",
  version: MCP_VERSION,
});

server.tool(
  "perplexity_broker_info",
  "Broker/MCP build info: mcp_version, prompt suffix behavior. Call to verify Cursor loaded the latest MCP after Reload Window.",
  {},
  async () => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            ok: true,
            mcp_version: MCP_VERSION,
            prompt_suffix_on_submit: true,
            prompt_suffix_applied_by: "broker",
            suffix_separator: CHAT_OUTPUT_INSTRUCTION_SEPARATOR,
            tools: ["perplexity_submit_question", "perplexity_get_answer", "perplexity_broker_info"],
          }),
        },
      ],
    };
  },
);

server.tool(
  "perplexity_submit_question",
  "Queue a question in Perplexity only — this tool does NOT return an answer. Put multiple numbered tasks in one question when the agent needs several research outputs (one poll, one result). Optional chat_id continues that chat; omit for a new topic. Returns chat_id and status running. Answers are INVALID until perplexity_get_answer returns status completed (or error). You MUST call perplexity_get_answer with this chat_id: first poll ~30s after submit, then every 60s up to 16 minutes. Do not parallel-submit on one session (BUSY). Do not edit publishable facts while running.",
  {
    question: questionSchema,
    chat_id: chatIdSchema,
    format: formatSchema,
  },
  async ({ question, chat_id, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

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
        next_step:
          "Call perplexity_get_answer with this chat_id. Wait ~30s before the first poll, then every 60s until status is completed or error (up to 16 min). Do not use submit output as research; result appears only after completed.",
      });
    } catch (error) {
      return agentJsonContent(failureFromError(error, chat_id));
    }
  },
);

server.tool(
  "perplexity_get_answer",
  "Poll a queued question by chat_id (from perplexity_submit_question). Opens/reloads the Perplexity thread. status running means no verified result yet — keep polling (~30s first check, then every 60s, up to 16 min). Complex multi-task briefs may run 10-15 min with visible_chars 0 or flat while Perplexity reasons; that is normal — keep polling. Only status completed includes trustworthy result; error ends the poll. Pack several numbered tasks into one submit question when possible; do not parallel-submit on one session.",
  {
    chat_id: chatIdRequiredSchema,
    format: formatSchema,
  },
  async ({ chat_id, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

    try {
      const result = await brokerFetch<ThreadStatusSuccess>("/thread/status", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SESSION_ID,
          chatId: chat_id,
          responseFormat: format,
        }),
      });

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
