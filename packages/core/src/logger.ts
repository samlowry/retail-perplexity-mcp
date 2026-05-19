export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  sessionId?: string;
  jobId?: string;
  action?: string;
  step?: string;
  result?: string;
  durationMs?: number;
  message?: string;
  data?: Record<string, unknown>;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Structured JSON logger for broker and worker steps. */
export class JsonLogger {
  constructor(private readonly minLevel: LogLevel = "info") {}

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  log(event: Omit<LogEvent, "timestamp" | "level"> & { level?: LogLevel }): void {
    const level = event.level ?? "info";
    if (!this.shouldLog(level)) return;

    const line: LogEvent = {
      timestamp: new Date().toISOString(),
      level,
      ...event,
    };
    const output = JSON.stringify(line);
    if (level === "error") {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  step(
    step: string,
    fields: Omit<LogEvent, "timestamp" | "level" | "step"> & { level?: LogLevel },
  ): void {
    this.log({ ...fields, step });
  }
}
