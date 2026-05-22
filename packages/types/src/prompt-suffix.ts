/** Visible delimiter before the broker-injected instruction (not a markdown HR). */
export const CHAT_OUTPUT_INSTRUCTION_SEPARATOR =
  "\n\n[Instruction — reply in this chat only]\n\n";

/** @deprecated Perplexity treats `----` as a horizontal rule and hides the suffix in the user bubble. */
export const LEGACY_CHAT_OUTPUT_INSTRUCTION_SEPARATOR = "\n\n----\n\n";

/**
 * Instruction appended to every submit so Perplexity answers in-chat, not as files.
 */
export const CHAT_OUTPUT_INSTRUCTION =
  "Output your entire response directly in this chat. Do not create files, attachments, canvas artifacts, or downloadable documents — put all content in the message body.";

/** Result of preparing text sent to the broker on chat submit. */
export interface PreparedSubmitPrompt {
  text: string;
  /** False when the question already contained the instruction block. */
  suffixApplied: boolean;
}

function buildSuffixBlock(separator: string): string {
  return `${separator}${CHAT_OUTPUT_INSTRUCTION}`;
}

function alreadyHasInstructionBlock(trimmed: string): boolean {
  if (trimmed.endsWith(CHAT_OUTPUT_INSTRUCTION)) {
    return true;
  }
  const blocks = [
    buildSuffixBlock(CHAT_OUTPUT_INSTRUCTION_SEPARATOR),
    buildSuffixBlock(LEGACY_CHAT_OUTPUT_INSTRUCTION_SEPARATOR),
  ];
  return blocks.some((block) => trimmed.includes(block));
}

/**
 * Append the chat-output instruction after the user question (idempotent if already present).
 */
export function prepareSubmitPrompt(question: string): PreparedSubmitPrompt {
  const trimmed = question.trimEnd();
  if (alreadyHasInstructionBlock(trimmed)) {
    return { text: trimmed, suffixApplied: false };
  }
  return {
    text: `${trimmed}${buildSuffixBlock(CHAT_OUTPUT_INSTRUCTION_SEPARATOR)}`,
    suffixApplied: true,
  };
}

/** @deprecated Use prepareSubmitPrompt */
export function appendChatOutputInstruction(question: string): string {
  return prepareSubmitPrompt(question).text;
}
