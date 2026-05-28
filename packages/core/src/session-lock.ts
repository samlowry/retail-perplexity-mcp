/** Serializes work per session_id; overlap is rejected as BUSY. */
export class SessionLock {
  private readonly active = new Set<string>();

  async runExclusive<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    if (this.active.has(sessionId)) {
      throw new Error(`Session busy: ${sessionId}`);
    }

    this.active.add(sessionId);
    try {
      return await fn();
    } finally {
      this.active.delete(sessionId);
    }
  }

  isBusy(sessionId: string): boolean {
    return this.active.has(sessionId);
  }
}
