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
  newThread: z.boolean().optional(),
  timeoutMs: z.number().int().positive().optional(),
  wait: z.boolean().optional().default(true),
  responseFormat: responseFormatSchema.optional().default("markdown"),
  idempotencyKey: z.string().optional(),
});

export const chatCancelBodySchema = z.object({
  sessionId: sessionIdSchema,
  jobId: z.string().optional(),
});

export const attachmentUploadBodySchema = z.object({
  sessionId: sessionIdSchema,
  filePath: z.string().min(1),
});

export const jobIdParamsSchema = z.object({
  id: z.string().min(1),
});
