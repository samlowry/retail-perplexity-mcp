/** Short-lived idempotency cache for duplicate job submissions. */
export class IdempotencyCache {
  private readonly entries = new Map<string, { jobId: string; expiresAt: number }>();

  constructor(private readonly ttlMs = 60_000) {}

  get(key: string): string | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.jobId;
  }

  set(key: string, jobId: string): void {
    this.entries.set(key, { jobId, expiresAt: Date.now() + this.ttlMs });
  }
}
