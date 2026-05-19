import type { ConcurrentRequestPolicy } from "./config.js";

interface QueueItem {
  run: () => Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/** Serializes work per session_id; supports reject or fifo queue. */
export class SessionLock {
  private readonly active = new Set<string>();
  private readonly queues = new Map<string, QueueItem[]>();

  constructor(private readonly policy: ConcurrentRequestPolicy) {}

  async runExclusive<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    if (this.policy === "reject" && this.active.has(sessionId)) {
      throw new Error(`Session busy: ${sessionId}`);
    }

    if (this.active.has(sessionId)) {
      return new Promise<T>((resolve, reject) => {
        const item: QueueItem = {
          run: async () => {
            try {
              resolve(await fn());
            } catch (error) {
              reject(error);
            }
          },
          resolve: () => undefined,
          reject,
        };
        const queue = this.queues.get(sessionId) ?? [];
        queue.push(item);
        this.queues.set(sessionId, queue);
      });
    }

    this.active.add(sessionId);
    try {
      return await fn();
    } finally {
      this.active.delete(sessionId);
      const queue = this.queues.get(sessionId);
      if (queue && queue.length > 0) {
        const next = queue.shift();
        if (queue.length === 0) this.queues.delete(sessionId);
        if (next) {
          this.active.add(sessionId);
          void next.run().finally(() => {
            this.active.delete(sessionId);
          });
        }
      }
    }
  }

  isBusy(sessionId: string): boolean {
    return this.active.has(sessionId);
  }
}
