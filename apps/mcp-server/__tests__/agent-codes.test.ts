import { describe, expect, it } from "vitest";
import { BrokerErrorCode } from "@pdb/types";
import { toAgentErrorCode } from "../src/broker-client.js";

describe("toAgentErrorCode", () => {
  it("maps AUTH_REQUIRED to NEEDS_LOGIN", () => {
    expect(toAgentErrorCode(BrokerErrorCode.AUTH_REQUIRED)).toBe("NEEDS_LOGIN");
  });

  it("maps GENERATION_TIMEOUT to TIMEOUT", () => {
    expect(toAgentErrorCode(BrokerErrorCode.GENERATION_TIMEOUT)).toBe("TIMEOUT");
  });

  it("maps CONFLICT to BUSY", () => {
    expect(toAgentErrorCode(BrokerErrorCode.CONFLICT)).toBe("BUSY");
  });

  it("maps unknown codes to FAILED", () => {
    expect(toAgentErrorCode(BrokerErrorCode.UI_CHANGED)).toBe("FAILED");
  });
});
