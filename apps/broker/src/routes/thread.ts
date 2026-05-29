import type { FastifyInstance } from "fastify";
import { threadNewBodySchema, threadStatusBodySchema, BrokerErrorCode } from "@pdb/types";
import { getService } from "../service-holder.js";

export async function registerThreadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/thread/new", async (request, reply) => {
    const body = threadNewBodySchema.parse(request.body);
    const result = await getService().newThread(body.sessionId);
    if ("ok" in result && result.ok === false) {
      return reply.status(400).send(result);
    }
    return { ok: true, threadId: undefined };
  });

  app.post("/thread/status", async (request, reply) => {
    const body = threadStatusBodySchema.parse(request.body);
    const result = await getService().getThreadStatus(
      body.sessionId,
      body.chatId,
      body.responseFormat,
    );
    if ("ok" in result && result.ok === false) {
      const status = result.code === BrokerErrorCode.AUTH_REQUIRED ? 401 : 400;
      return reply.status(status).send(result);
    }
    return result;
  });
}
