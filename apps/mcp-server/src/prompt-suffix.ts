/** Separator before the broker-injected instruction block on every submit. */
export const CHAT_OUTPUT_INSTRUCTION_SEPARATOR = "\n\n----\n\n";

/**
 * Instruction appended to every MCP submit so Perplexity answers in-chat, not as files.
 */
export const CHAT_OUTPUT_INSTRUCTION =
  "Output your entire response directly in this chat. Do not create files, attachments, canvas artifacts, or downloadable documents — put all content in the message body.";

/** Result of preparing text sent to the broker on perplexity_submit. */
export interface PreparedSubmitPrompt {
  text: string;
  /** False when the question already contained the suffix block. */
  suffixApplied: boolean;
}

/**
 * Append the chat-output instruction after the user question (idempotent if already present).
 */
export function prepareSubmitPrompt(question: string): PreparedSubmitPrompt {
  const trimmed = question.trimEnd();
  const suffix = `${CHAT_OUTPUT_INSTRUCTION_SEPARATOR}${CHAT_OUTPUT_INSTRUCTION}`;
  if (trimmed.endsWith(CHAT_OUTPUT_INSTRUCTION) || trimmed.includes(suffix)) {
    return { text: trimmed, suffixApplied: false };
  }
  return { text: `${trimmed}${suffix}`, suffixApplied: true };
}

/** @deprecated Use prepareSubmitPrompt */
export function appendChatOutputInstruction(question: string): string {
  return prepareSubmitPrompt(question).text;
}
