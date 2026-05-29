import { describe, expect, it } from "vitest";
import { parsePreparedUsingFromText } from "../src/answer-attribution.js";

describe("parsePreparedUsingFromText", () => {
  it("parses standard attribution line", () => {
    expect(
      parsePreparedUsingFromText("Prepared using Claude Sonnet 4.6 Thinking"),
    ).toBe("Claude Sonnet 4.6 Thinking");
  });

  it("parses attribution with trailing separator", () => {
    expect(parsePreparedUsingFromText("Prepared using GPT-5.4 ·")).toBe("GPT-5.4");
  });

  it("returns null when line is missing", () => {
    expect(parsePreparedUsingFromText("No attribution here")).toBeNull();
  });
});
