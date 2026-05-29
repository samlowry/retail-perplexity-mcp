import type { Page } from "playwright-core";
import { detectUiState } from "@pdb/ui-state";
import { UiState, type UiStateType } from "@pdb/ui-state";
import {
  BrokerErrorCode,
  type BrokerError,
  type ChatAnswerResult,
  type ResponseFormatType,
} from "@pdb/types";
import { getLastAnswer } from "./extract.js";
import { getLastAnswerBlock, extractPreparedUsing } from "@pdb/ui-selectors";
import { captureArtifacts } from "./artifacts.js";

export type GenerationPhase = "generating" | "finished";

export interface GenerationPollResult {
  phase: GenerationPhase;
  uiState: UiStateType;
  error?: BrokerError;
}

const GENERATING_STATES: UiStateType[] = [
  UiState.GENERATING,
  UiState.STREAMING_PARTIAL,
  UiState.FILE_UPLOADING,
];

const FINISHED_STATES: UiStateType[] = [UiState.COMPLETE, UiState.READY];

/** Map UI detection to agent generation phase and optional broker error. */
export function uiStateToPollResult(state: UiStateType, detail?: string): GenerationPollResult {
  if (GENERATING_STATES.includes(state)) {
    return { phase: "generating", uiState: state };
  }
  if (FINISHED_STATES.includes(state)) {
    return { phase: "finished", uiState: state };
  }
  if (state === UiState.AUTH_EXPIRED) {
    const hint =
      detail === "sign_in_button" || detail === "auth_url"
        ? "Log in via the broker profile browser (pnpm doctor), then retry."
        : "Session may have expired — log in manually in PROFILE_DIR browser.";
    return {
      phase: "finished",
      uiState: state,
      error: {
        ok: false,
        code: BrokerErrorCode.AUTH_REQUIRED,
        message: detail ? `${detail}: ${hint}` : hint,
        lastUiState: state,
      },
    };
  }
  if (state === UiState.RATE_LIMITED) {
    return {
      phase: "finished",
      uiState: state,
      error: {
        ok: false,
        code: BrokerErrorCode.RATE_LIMITED,
        message: "Rate limited",
        lastUiState: state,
      },
    };
  }
  if (state === UiState.NETWORK_ERROR) {
    return {
      phase: "finished",
      uiState: state,
      error: {
        ok: false,
        code: BrokerErrorCode.NETWORK_ERROR,
        message: "Network error in Perplexity UI",
        lastUiState: state,
      },
    };
  }
  if (state === UiState.CONFIRMATION_DIALOG) {
    return {
      phase: "finished",
      uiState: state,
      error: {
        ok: false,
        code: BrokerErrorCode.UNKNOWN_UI_STATE,
        message: "Confirmation dialog blocks generation",
        lastUiState: state,
      },
    };
  }
  return {
    phase: "generating",
    uiState: state,
  };
}

/** Exported for tests. */
export function normalizeThreadUrl(url: string): string {
  return url.split("#")[0].replace(/\/$/, "");
}

/**
 * How to open a Perplexity thread before broker work.
 * See docs/internal/thread-navigation.md.
 */
export const ThreadOpenPolicy = {
  /** Status poll: reload when tab is already on this thread (unfreeze SPA). */
  StatusPoll: "statusPoll",
  /** Follow-up submit: keep live DOM when already on thread; goto when elsewhere. */
  FollowUpSubmit: "followUpSubmit",
} as const;

export type ThreadOpenPolicy =
  (typeof ThreadOpenPolicy)[keyof typeof ThreadOpenPolicy];

/**
 * Open the chat-of-interest before submit or status read.
 * Different URL → full goto. Same URL → reload only for statusPoll.
 */
export async function openThreadUrl(
  page: Page,
  threadUrl: string,
  policy: ThreadOpenPolicy = ThreadOpenPolicy.FollowUpSubmit,
): Promise<void> {
  const current = normalizeThreadUrl(page.url());
  const target = normalizeThreadUrl(threadUrl);
  if (current === target) {
    if (policy === ThreadOpenPolicy.StatusPoll) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("load").catch(() => undefined);
    }
    return;
  }
  await page.goto(threadUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}

/** Length of visible answer text on page (0 if no answer block yet). */
export async function measureVisibleAnswerChars(page: Page): Promise<number> {
  const block = await getLastAnswerBlock(page);
  if (!block) return 0;
  const text = (await block.locator.innerText().catch(() => "")).trim();
  return text.length;
}

/** Non-blocking poll: detect generating vs finished from current page UI. */
export async function pollGenerationPhase(page: Page): Promise<GenerationPollResult> {
  const { state, detail } = await detectUiState(page);
  return uiStateToPollResult(state, detail);
}

/** Extract answer when UI reports generation complete. */
export async function extractAnswerResult(
  page: Page,
  responseFormat: ResponseFormatType,
  timings: { sendMs: number; generationMs: number },
  artifactsDir?: string,
): Promise<ChatAnswerResult | BrokerError> {
  const extractStart = Date.now();
  try {
    const answer = await getLastAnswer(page, responseFormat);
    const preparedUsing = await extractPreparedUsing(page);
    const extractMs = Date.now() - extractStart;
    return {
      threadId: undefined,
      messageId: undefined,
      status: "completed",
      answerText: answer.text,
      answerMarkdown: answer.markdown ?? answer.text,
      preparedUsing,
      sources: answer.sources,
      timings: {
        queueMs: 0,
        sendMs: timings.sendMs,
        generationMs: timings.generationMs,
        extractMs,
      },
      artifacts: {},
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "ok" in error) {
      return error as BrokerError;
    }
    const artifacts = artifactsDir
      ? await captureArtifacts(page, artifactsDir, "extract-error")
      : { screenshot: undefined, htmlSnapshot: undefined };
    return {
      ok: false,
      code: BrokerErrorCode.EXTRACTION_FAILED,
      message: error instanceof Error ? error.message : String(error),
      artifacts: {
        screenshot: artifacts.screenshot,
        htmlSnapshot: artifacts.htmlSnapshot,
      },
    };
  }
}
