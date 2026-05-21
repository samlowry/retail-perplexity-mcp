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
  type JobPollSuccess,
} from "./broker-client.js";

const SESSION_ID = "default";

/** MCP tools return JSON in text content; ok discriminates success vs failure. */
type AgentSuccess = {
  ok: true;
  answer?: string;
  job_id?: string;
  status?: "generating" | "finished";
  sources?: ChatSendSuccess["answer"]["sources"];
  timings_ms?: Record<string, number>;
  thread_url?: string;
};

type AgentFailure = {
  ok: false;
  code: string;
  message: string;
  job_id?: string;
};

function agentJsonContent(payload: AgentSuccess | AgentFailure) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

async function ensureBrokerHealthy(): Promise<AgentFailure | null> {
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

function failureFromError(error: unknown, jobId?: string): AgentFailure {
  if (error instanceof BrokerNetworkError) {
    return { ok: false, code: "BROKER_OFFLINE", message: error.message, job_id: jobId };
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
    return { ok: false, code, message, job_id: jobId };
  }
  return {
    ok: false,
    code: "FAILED",
    message: error instanceof Error ? error.message : String(error),
    job_id: jobId,
  };
}

const questionSchema = z.string().min(1);
const newChatSchema = z.boolean().optional().default(false);
const formatSchema = z.enum(["markdown", "text"]).optional().default("markdown");
const timeoutSecondsSchema = z.number().positive().optional().default(900);

const server = new McpServer({
  name: "perplexity-desktop-broker",
  version: "0.2.0",
});

server.tool(
  "perplexity_submit",
  "Submit a Perplexity question without waiting for the answer. Returns job_id; poll with perplexity_status. Use for waits longer than ~60s or concurrent tasks.",
  {
    question: questionSchema,
    new_chat: newChatSchema,
    timeout_seconds: timeoutSecondsSchema,
    format: formatSchema,
  },
  async ({ question, new_chat, timeout_seconds, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

    try {
      const result = await brokerFetch<{ ok: true; jobId: string; status?: string }>("/chat/send", {
        method: "POST",
        body: JSON.stringify({
          sessionId: SESSION_ID,
          text: question,
          newThread: new_chat,
          timeoutMs: timeout_seconds * 1000,
          wait: false,
          responseFormat: format,
        }),
      });

      return agentJsonContent({
        ok: true,
        job_id: result.jobId,
        status: "generating",
      });
    } catch (error) {
      return agentJsonContent(failureFromError(error));
    }
  },
);

server.tool(
  "perplexity_status",
  "Poll a submitted job by job_id. Opens the Perplexity thread URL when needed. status is generating or finished; answer present when finished successfully.",
  {
    job_id: z.string().min(1),
    format: formatSchema,
  },
  async ({ job_id, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

    try {
      const result = await brokerFetch<JobPollSuccess>(`/job/${encodeURIComponent(job_id)}`);

      if (result.status === "generating") {
        return agentJsonContent({
          ok: true,
          job_id: result.jobId,
          status: "generating",
          thread_url: result.threadUrl,
        });
      }

      if (result.error) {
        return agentJsonContent({
          ok: false,
          code: toAgentErrorCode(result.error.code),
          message: result.error.message,
          job_id: result.jobId,
        });
      }

      if (!result.answer) {
        return agentJsonContent({
          ok: false,
          code: "FAILED",
          message: "Job finished without an answer payload",
          job_id: result.jobId,
        });
      }

      return agentJsonContent({
        ok: true,
        job_id: result.jobId,
        status: "finished",
        answer: formatAnswer(result.answer, format),
        sources: result.answer.sources?.length ? result.answer.sources : undefined,
        timings_ms: formatTimingsMs(result.answer.timings),
        thread_url: result.threadUrl,
      });
    } catch (error) {
      return agentJsonContent(failureFromError(error, job_id));
    }
  },
);

server.tool(
  "perplexity_ask",
  "Ask Perplexity and wait for the full answer (blocks MCP until done). For long research or multiple concurrent tasks, use perplexity_submit + perplexity_status instead.",
  {
    question: questionSchema,
    new_chat: newChatSchema,
    timeout_seconds: timeoutSecondsSchema,
    format: formatSchema,
  },
  async ({ question, new_chat, timeout_seconds, format }) => {
    const offline = await ensureBrokerHealthy();
    if (offline) return agentJsonContent(offline);

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
        job_id: result.jobId,
        status: "finished",
      };
      return agentJsonContent(success);
    } catch (error) {
      return agentJsonContent(failureFromError(error));
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
