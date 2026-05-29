import type { BrokerError } from "@pdb/types";
import type { BrowserSessionManager } from "./session.js";

/** Attach recent worker actions to a broker error for troubleshooting. */
export function withActionLog(
  session: BrowserSessionManager,
  error: BrokerError,
): BrokerError {
  return {
    ...error,
    debug: {
      actionLog: session.actionLog.snapshot(),
    },
  };
}
