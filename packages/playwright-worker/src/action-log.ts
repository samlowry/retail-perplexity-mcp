export interface ActionLogEntry {
  at: string;
  action: string;
  detail?: string;
}

/** Ring buffer of last N worker actions for debugging. */
export class ActionLog {
  private readonly entries: ActionLogEntry[] = [];

  constructor(private readonly maxSize = 20) {}

  record(action: string, detail?: string): void {
    this.entries.push({ at: new Date().toISOString(), action, detail });
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  snapshot(): ActionLogEntry[] {
    return [...this.entries];
  }
}
