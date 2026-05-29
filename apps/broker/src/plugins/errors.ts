import type { FastifyInstance } from "fastify";
import { BrokerErrorCode } from "@pdb/types";

/** Map thrown errors to normalized BrokerError JSON. */
export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: Error, _request, reply) => {
    reply.status(500).send({
      ok: false,
      code: BrokerErrorCode.INTERNAL_ERROR,
      message: error.message,
    });
  });
}
