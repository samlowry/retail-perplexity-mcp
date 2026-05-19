import { randomUUID } from "node:crypto";
import type { JobRecord, JobStatusType } from "@pdb/types";
import { JobStatus } from "@pdb/types";
import { assertTransition } from "./job-fsm.js";

/** In-memory job store with optional persistence hook later. */
export class JobStore {
  private readonly jobs = new Map<string, JobRecord>();

  create(partial: Omit<JobRecord, "jobId" | "createdAt" | "updatedAt" | "status">): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = {
      ...partial,
      jobId: `job_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      status: JobStatus.QUEUED,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.jobId, job);
    return job;
  }

  get(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId);
  }

  updateStatus(jobId: string, status: JobStatusType): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    assertTransition(job.status, status);
    job.status = status;
    job.updatedAt = new Date().toISOString();
    return job;
  }

  patch(jobId: string, patch: Partial<JobRecord>): JobRecord {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    return job;
  }
}
