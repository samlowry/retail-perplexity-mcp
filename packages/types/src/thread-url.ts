/**
 * Normalize agent-facing chat id to a Perplexity thread URL.
 * Accepts full URL or search slug (e.g. abbc8f96-2fbf-415d-a76c-f18b5a95848e).
 */
export function normalizeChatId(chatId: string): string {
  const trimmed = chatId.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const slug = trimmed.replace(/^\/+/, "").replace(/^search\//, "");
  return `https://www.perplexity.ai/search/${slug}`;
}
