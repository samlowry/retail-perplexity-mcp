import { describe, expect, it } from "vitest";
import {
  appendChatOutputInstruction,
  prepareSubmitPrompt,
  CHAT_OUTPUT_INSTRUCTION,
  CHAT_OUTPUT_INSTRUCTION_SEPARATOR,
} from "../src/prompt-suffix.js";

describe("prepareSubmitPrompt", () => {
  it("appends separator and instruction", () => {
    const { text: out, suffixApplied } = prepareSubmitPrompt("Write a landing page.");
    expect(suffixApplied).toBe(true);
    expect(out).toContain("Write a landing page.");
    expect(out).toContain(CHAT_OUTPUT_INSTRUCTION_SEPARATOR);
    expect(out.endsWith(CHAT_OUTPUT_INSTRUCTION)).toBe(true);
  });

  it("does not duplicate when already appended", () => {
    const once = prepareSubmitPrompt("Brief");
    const twice = prepareSubmitPrompt(once.text);
    expect(twice.text).toBe(once.text);
    expect(twice.suffixApplied).toBe(false);
  });
});

describe("appendChatOutputInstruction", () => {
  it("matches prepareSubmitPrompt text", () => {
    expect(appendChatOutputInstruction("x")).toBe(prepareSubmitPrompt("x").text);
  });
});
