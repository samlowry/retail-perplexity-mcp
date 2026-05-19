import { describe, expect, it } from "vitest";
import { JobStatus } from "@pdb/types";
import { canTransition, assertTransition } from "../src/job-fsm.js";

describe("job-fsm", () => {
  it("allows queued to running", () => {
    expect(canTransition(JobStatus.QUEUED, JobStatus.RUNNING)).toBe(true);
  });

  it("rejects succeeded to running", () => {
    expect(() => assertTransition(JobStatus.SUCCEEDED, JobStatus.RUNNING)).toThrow();
  });
});
