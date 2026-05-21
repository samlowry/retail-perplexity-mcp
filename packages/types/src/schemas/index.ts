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

/** Accept chatId or legacy threadUrl (agents may still send thread_url). */
export const threadStatusBodySchema = z
  .object({
    sessionId: sessionIdSchema,
    chatId: z.string().min(1).optional(),
    threadUrl: z.string().min(1).optional(),
    responseFormat: responseFormatSchema.optional().default("markdown"),
  })
  .refine((body) => Boolean(body.chatId?.trim() || body.threadUrl?.trim()), {
    message: "chatId or threadUrl is required",
  })
  .transform((body) => ({
    sessionId: body.sessionId,
    chatId: (body.chatId ?? body.threadUrl)!.trim(),
    responseFormat: body.responseFormat,
  }));

export const chatCancelBodySchema = z.object({
  sessionId: sessionIdSchema,
  jobId: z.string().optional(),
});

export const attachmentUploadBodySchema = z.object({
  sessionId: sessionIdSchema,
  filePath: z.string().min(1),
});

