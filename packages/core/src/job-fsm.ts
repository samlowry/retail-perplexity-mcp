import { JobStatus, type JobStatusType } from "@pdb/types";

const TRANSITIONS: Record<JobStatusType, JobStatusType[]> = {
  [JobStatus.QUEUED]: [JobStatus.RUNNING, JobStatus.CANCELLED],
  [JobStatus.RUNNING]: [
    JobStatus.WAITING_USER,
    JobStatus.SUCCEEDED,
    JobStatus.FAILED,
    JobStatus.TIMED_OUT,
    JobStatus.CANCELLED,
  ],
  [JobStatus.WAITING_USER]: [
    JobStatus.RUNNING,
    JobStatus.SUCCEEDED,
    JobStatus.FAILED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.SUCCEEDED]: [],
  [JobStatus.FAILED]: [],
  [JobStatus.TIMED_OUT]: [],
  [JobStatus.CANCELLED]: [],
};

/** Returns true if transition is allowed by the job state machine. */
export function canTransition(from: JobStatusType, to: JobStatusType): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Transition status or throw if illegal. */
export function assertTransition(from: JobStatusType, to: JobStatusType): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal job transition: ${from} -> ${to}`);
  }
}
