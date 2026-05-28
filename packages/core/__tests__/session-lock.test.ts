import { describe, expect, it } from "vitest";
import { SessionLock } from "../src/session-lock.js";

describe("SessionLock", () => {
  it("rejects overlapping calls for same session", async () => {
    const lock = new SessionLock();

    let releaseFirst!: () => void;
    const first = lock.runExclusive("s1", async () => {
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      return "first";
    });

    await Promise.resolve();

    const second = lock.runExclusive("s1", async () => "second");
    await expect(second).rejects.toThrow("Session busy: s1");

    releaseFirst();
    await expect(first).resolves.toBe("first");
  });

  it("allows sequential calls after release", async () => {
    const lock = new SessionLock();

    await expect(lock.runExclusive("s1", async () => "one")).resolves.toBe("one");
    await expect(lock.runExclusive("s1", async () => "two")).resolves.toBe("two");
  });
});
