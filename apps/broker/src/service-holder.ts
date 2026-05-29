import { loadConfig, BrokerService } from "@pdb/core";

let brokerService: BrokerService | null = null;

/** Lazy singleton broker service for route handlers. */
export function getService(): BrokerService {
  if (!brokerService) {
    brokerService = new BrokerService(loadConfig());
  }
  return brokerService;
}

/** Reset service instance (tests). */
export function resetService(): void {
  brokerService = null;
}
