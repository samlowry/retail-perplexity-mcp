import {
  formatAnswer,
  formatTimingsMs,
  toAgentErrorCode,
  type ThreadStatusSuccess,
} from "./broker-client.js";
import { MCP_VERSION } from "./version.js";

/** MCP tools return JSON in text content. */
export type AgentToolSuccess = {
  ok: true;
  mcp_version: string;
  chat_id: string;
  status: "running" | "completed" | "error";
  prompt_suffix_applied?: boolean;
  next_step?: string;
  result?: string;
  error_message?: string;
  visible_chars?: number;
  sources?: NonNullable<ThreadStatusSuccess["answer"]>["sources"];
  timings_ms?: Record<string, number>;
  code?: string;
  last_ui_state?: string;
  submit_model?: string | null;
  submit_reasoning_enabled?: boolean | null;
  prepared_using?: string | null;
};

export function statusPayloadFromBroker(
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
    prepared_using: result.answer.preparedUsing ?? null,
    sources: result.answer.sources?.length ? result.answer.sources : undefined,
    timings_ms: formatTimingsMs(result.answer.timings),
    visible_chars: result.answer.answerText.length,
  };
}
