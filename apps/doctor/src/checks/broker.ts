import type { CheckResult } from "./env.js";

export async function checkBroker(): Promise<CheckResult> {
  const host = process.env.BROKER_HOST ?? "127.0.0.1";
  const port = process.env.BROKER_PORT ?? "3317";

  try {
    const response = await fetch(`http://${host}:${port}/health`);
    const body = await response.json();
    return {
      name: "broker_reachable",
      ok: response.ok,
      message: response.ok ? JSON.stringify(body) : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name: "broker_reachable",
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
