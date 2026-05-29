import type { FastifyInstance } from "fastify";
import { sessionEnsureBodySchema } from "@pdb/types";
import { getService } from "../service-holder.js";

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  app.post("/session/ensure", async (request, reply) => {
    const body = sessionEnsureBodySchema.parse(request.body);
    const result = await getService().ensureSession(body.sessionId);
    if ("ok" in result && result.ok === false) {
      return reply.status(401).send(result);
    }
    return result;
  });
}
