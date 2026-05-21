/** Separator before the broker-injected instruction block on every submit. */
export const CHAT_OUTPUT_INSTRUCTION_SEPARATOR = "\n\n----\n\n";

/**
 * Instruction appended to every MCP submit so Perplexity answers in-chat, not as files.
 */
export const CHAT_OUTPUT_INSTRUCTION =
  "Output your entire response directly in this chat. Do not create files, attachments, canvas artifacts, or downloadable documents — put all content in the message body.";

/**
 * Append the chat-output instruction after the user question (idempotent if already present).
 */
export function appendChatOutputInstruction(question: string): string {
  const trimmed = question.trimEnd();
  const suffix = `${CHAT_OUTPUT_INSTRUCTION_SEPARATOR}${CHAT_OUTPUT_INSTRUCTION}`;
  if (trimmed.endsWith(CHAT_OUTPUT_INSTRUCTION) || trimmed.includes(suffix)) {
    return trimmed;
  }
  return `${trimmed}${suffix}`;
}
