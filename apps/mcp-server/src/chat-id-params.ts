import { z } from "zod";

/** Optional chat id: prefer chat_id; thread_url is a deprecated alias (same value). */
export const chatIdOptionalParams = {
  chat_id: z.string().min(1).optional(),
  thread_url: z.string().min(1).optional(),
};

/** Required chat id for status polls. */
export const chatIdRequiredParams = {
  chat_id: z.string().min(1).optional(),
  thread_url: z.string().min(1).optional(),
};

/**
 * Resolve MCP chat_id / legacy thread_url to a single string for the broker.
 */
export function resolveChatIdInput(
  input: { chat_id?: string; thread_url?: string },
  toolName: string,
): { ok: true; chatId: string } | { ok: false; message: string } {
  const chatId = input.chat_id?.trim() || input.thread_url?.trim();
  if (!chatId) {
    return {
      ok: false,
      message: `${toolName}: provide chat_id (or thread_url alias) from perplexity_submit`,
    };
  }
  return { ok: true, chatId };
}
