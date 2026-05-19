const BROKER_BASE = `http://${process.env.BROKER_HOST ?? "127.0.0.1"}:${process.env.BROKER_PORT ?? "3317"}`;

/** Thin HTTP client for broker API (no business logic). */
export async function brokerFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${BROKER_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json()) as T;
  if (!response.ok) {
    throw new Error(JSON.stringify(body));
  }
  return body;
}
