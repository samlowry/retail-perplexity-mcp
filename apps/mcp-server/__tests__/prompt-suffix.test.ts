import { describe, expect, it } from "vitest";
import {
  appendChatOutputInstruction,
  CHAT_OUTPUT_INSTRUCTION,
  CHAT_OUTPUT_INSTRUCTION_SEPARATOR,
} from "../src/prompt-suffix.js";

describe("appendChatOutputInstruction", () => {
  it("appends separator and instruction", () => {
    const out = appendChatOutputInstruction("Write a landing page.");
    expect(out).toContain("Write a landing page.");
    expect(out).toContain(CHAT_OUTPUT_INSTRUCTION_SEPARATOR);
    expect(out.endsWith(CHAT_OUTPUT_INSTRUCTION)).toBe(true);
  });

  it("does not duplicate when already appended", () => {
    const once = appendChatOutputInstruction("Brief");
    const twice = appendChatOutputInstruction(once);
    expect(twice).toBe(once);
  });
});
