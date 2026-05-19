import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

describe("GET /health", () => {
  it("returns broker up", async () => {
    const app = await createServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.broker).toBe("up");
  });
});
