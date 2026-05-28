import { BrokerErrorCode, isBrokerError, type BrokerError } from "@pdb/types";
import type { ChatAnswerResult, HealthResponse, ThreadTaskStatusType } from "@pdb/types";

const BROKER_BASE = `http://${process.env.BROKER_HOST ?? "127.0.0.1"}:${process.env.BROKER_PORT ?? "3317"}`;

/** Thrown when the broker HTTP endpoint is unreachable. */
export class BrokerNetworkError extends Error {
  constructor(cause?: unknown) {
    super("Broker is not reachable. Start with pnpm dev:broker.");
    this.name = "BrokerNetworkError";
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Thrown when the broker returns a non-2xx JSON body. */
export class BrokerRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(JSON.stringify(body));
    this.name = "BrokerRequestError";
  }
}

export interface ChatSubmitSuccess {
  ok: true;
  chatId: string;
  promptSuffixApplied?: boolean;
}

export interface ThreadStatusSuccess {
  ok: true;
  chatId: string;
  status: ThreadTaskStatusType;
  visibleChars?: number;
  answer?: ChatAnswerResult;
  error?: BrokerError;
  lastUiState?: string;
}

/** Returns false when fetch fails or health reports down. */
export async function brokerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BROKER_BASE}/health`);
    if (!response.ok) return false;
    const body = (await response.json()) as HealthResponse;
    return body.ok === true;
  } catch {
    return false;
  }
}

/** Thin HTTP client for broker API (no business logic). */
export async function brokerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BROKER_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new BrokerNetworkError(error);
  }

  const body = (await response.json()) as T;
  if (!response.ok) {
    throw new BrokerRequestError(response.status, body);
  }
  return body;
}

export function parseBrokerErrorBody(body: unknown): BrokerError | null {
  if (isBrokerError(body)) return body;
  if (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof (body as { code: unknown }).code === "string"
  ) {
    return {
      ok: false,
      code: (body as { code: string }).code as BrokerError["code"],
      message:
        "message" in body && typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : "Request failed",
    };
  }
  return null;
}

export type AgentErrorCode =
  | "NEEDS_LOGIN"
  | "BROKER_OFFLINE"
  | "BUSY"
  | "RATE_LIMITED"
  | "UI_CHANGED"
  | "FAILED";

/** Map broker error codes to agent-facing MCP codes. */
export function toAgentErrorCode(brokerCode: string | undefined): AgentErrorCode {
  switch (brokerCode) {
    case BrokerErrorCode.AUTH_REQUIRED:
      return "NEEDS_LOGIN";
    case BrokerErrorCode.CONFLICT:
      return "BUSY";
    case BrokerErrorCode.RATE_LIMITED:
      return "RATE_LIMITED";
    case BrokerErrorCode.UI_CHANGED:
    case BrokerErrorCode.PROMPT_SEND_FAILED:
    case BrokerErrorCode.EXTRACTION_FAILED:
      return "UI_CHANGED";
    case BrokerErrorCode.NETWORK_ERROR:
      return "FAILED";
    default:
      return "FAILED";
  }
}

export function formatAnswer(
  answer: ChatAnswerResult,
  format: "markdown" | "text",
): string {
  if (format === "text") return answer.answerText;
  return answer.answerMarkdown ?? answer.answerText;
}

export function formatTimingsMs(timings: ChatAnswerResult["timings"]): Record<string, number> {
  return {
    queue_ms: timings.queueMs,
    send_ms: timings.sendMs,
    generation_ms: timings.generationMs,
    extract_ms: timings.extractMs,
  };
}
