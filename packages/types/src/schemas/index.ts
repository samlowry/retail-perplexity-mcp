import { z } from "zod";

export const sessionIdSchema = z.string().min(1).default("default");

export const responseFormatSchema = z.enum([
  "text",
  "markdown",
  "html_fragment",
  "json_best_effort",
]);

export const sessionEnsureBodySchema = z.object({
  sessionId: sessionIdSchema,
});

export const threadNewBodySchema = z.object({
  sessionId: sessionIdSchema,
});

export const chatSendBodySchema = z.object({
  sessionId: sessionIdSchema,
  text: z.string().min(1),
  chatId: z.string().min(1).optional(),
  responseFormat: responseFormatSchema.optional().default("markdown"),
});

export const threadStatusBodySchema = z.object({
  sessionId: sessionIdSchema,
  /** Full thread URL or search slug (same as MCP chat_id). */
  chatId: z.string().min(1),
  responseFormat: responseFormatSchema.optional().default("markdown"),
});

export const chatCancelBodySchema = z.object({
  sessionId: sessionIdSchema,
  jobId: z.string().optional(),
});

export const attachmentUploadBodySchema = z.object({
  sessionId: sessionIdSchema,
  filePath: z.string().min(1),
});

