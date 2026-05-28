import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ quiet: true });

export interface BrokerEnvConfig {
  brokerHost: string;
  brokerPort: number;
  logLevel: string;
}

/** Load broker listen configuration from environment. */
export function loadBrokerConfig(): BrokerEnvConfig {
  const brokerHost = process.env.BROKER_HOST ?? "127.0.0.1";
  const brokerPort = Number(process.env.BROKER_PORT ?? "3317");
  const logLevel = process.env.LOG_LEVEL ?? "info";

  if (!Number.isFinite(brokerPort) || brokerPort <= 0) {
    throw new Error("BROKER_PORT must be a positive integer");
  }

  return {
    brokerHost,
    brokerPort,
    logLevel,
  };
}

export function projectRoot(): string {
  return resolve(import.meta.dirname, "../../..");
}
