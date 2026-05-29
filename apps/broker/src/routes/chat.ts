import type { FastifyInstance } from "fastify";
import { chatCancelBodySchema, chatSendBodySchema, BrokerErrorCode } from "@pdb/types";
import { getService } from "../service-holder.js";

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/chat/send", async (request, reply) => {
    const body = chatSendBodySchema.parse(request.body);
    const result = await getService().submitChat(body);
    if ("error" in result) {
      const error = result.error;
      const status = error.code === BrokerErrorCode.AUTH_REQUIRED ? 401 : 400;
      return reply.status(status).send(error);
    }
    return {
      ok: true,
      chatId: result.chatId,
      promptSuffixApplied: result.promptSuffixApplied,
      submitContext: result.submitContext,
    };
  });

  app.post("/chat/cancel", async (request, reply) => {
    const body = chatCancelBodySchema.parse(request.body);
    const result = await getService().cancel(body.sessionId);
    if ("code" in result) {
      return reply.status(400).send(result);
    }
    return { ok: true, cancelled: result.cancelled };
  });
}
