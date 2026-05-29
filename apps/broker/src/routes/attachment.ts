import type { FastifyInstance } from "fastify";
import { attachmentUploadBodySchema } from "@pdb/types";
import { getService } from "../service-holder.js";

export async function registerAttachmentRoutes(app: FastifyInstance): Promise<void> {
  app.post("/attachment/upload", async (request, reply) => {
    const body = attachmentUploadBodySchema.parse(request.body);
    const result = await getService().upload(body.sessionId, body.filePath);
    if ("code" in result) {
      return reply.status(400).send(result);
    }
    return { ok: true, uploaded: result.uploaded };
  });
}
