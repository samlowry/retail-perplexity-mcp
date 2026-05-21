import { describe, expect, it } from "vitest";
import { BrokerErrorCode } from "@pdb/types";
import { toAgentErrorCode } from "../src/broker-client.js";

describe("toAgentErrorCode", () => {
  it("maps AUTH_REQUIRED to NEEDS_LOGIN", () => {
    expect(toAgentErrorCode(BrokerErrorCode.AUTH_REQUIRED)).toBe("NEEDS_LOGIN");
  });

  it("maps CONFLICT to BUSY", () => {
    expect(toAgentErrorCode(BrokerErrorCode.CONFLICT)).toBe("BUSY");
  });

  it("maps UI_CHANGED to UI_CHANGED", () => {
    expect(toAgentErrorCode(BrokerErrorCode.UI_CHANGED)).toBe("UI_CHANGED");
  });

  it("maps RATE_LIMITED to RATE_LIMITED", () => {
    expect(toAgentErrorCode(BrokerErrorCode.RATE_LIMITED)).toBe("RATE_LIMITED");
  });
});
