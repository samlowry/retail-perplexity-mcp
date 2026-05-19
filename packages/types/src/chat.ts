export const ResponseFormat = {
  TEXT: "text",
  MARKDOWN: "markdown",
  HTML_FRAGMENT: "html_fragment",
  JSON_BEST_EFFORT: "json_best_effort",
} as const;

export type ResponseFormatType =
  (typeof ResponseFormat)[keyof typeof ResponseFormat];

export interface Source {
  title: string;
  url: string;
}

export interface Timings {
  queueMs: number;
  sendMs: number;
  generationMs: number;
  extractMs: number;
}

export interface AnswerPayload {
  text: string;
  markdown?: string;
  htmlFragment?: string;
  sources: Source[];
  rawHtml?: string;
}

export interface ChatAnswerResult {
  threadId?: string;
  messageId?: string;
  status: "completed" | "partial" | "failed";
  answerText: string;
  answerMarkdown?: string;
  sources: Source[];
  timings: Timings;
  artifacts?: {
    screenshot?: string;
    htmlSnapshot?: string;
  };
}
