import Fastify from "fastify";
import helmet from "@fastify/helmet";
import {
  chatCancelBodySchema,
  chatSendBodySchema,
  sessionEnsureBodySchema,
  threadNewBodySchema,
  attachmentUploadBodySchema,
  threadStatusBodySchema,
  BrokerErrorCode,
} from "@pdb/types";
import { loadConfig } from "@pdb/core";
import { BrokerService } from "@pdb/core";
import { loadBrokerConfig } from "./config.js";

let brokerService: BrokerService | null = null;

function getService(): BrokerService {
  if (!brokerService) {
    brokerService = new BrokerService(loadConfig());
  }
  return brokerService;
}

/** Create Fastify instance with all MVP routes. */
export async function createServer() {
  const { logLevel } = loadBrokerConfig();
  const app = Fastify({ logger: { level: logLevel } });

  await app.register(helmet, { contentSecurityPolicy: false });

  app.setErrorHandler((error: Error, _request, reply) => {
    reply.status(500).send({
      ok: false,
      code: BrokerErrorCode.INTERNAL_ERROR,
      message: error.message,
    });
  });

  app.get("/health", async () => getService().getHealth());

  app.post("/session/ensure", async (request, reply) => {
    const body = sessionEnsureBodySchema.parse(request.body);
    const result = await getService().ensureSession(body.sessionId);
    if ("ok" in result && result.ok === false) {
      return reply.status(401).send(result);
    }
    return result;
  });

  app.post("/thread/new", async (request, reply) => {
    const body = threadNewBodySchema.parse(request.body);
    const result = await getService().newThread(body.sessionId);
    if ("ok" in result && result.ok === false) {
      return reply.status(400).send(result);
    }
    return { ok: true, threadId: undefined };
  });

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
    };
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

  app.post("/chat/cancel", async (request, reply) => {
    const body = chatCancelBodySchema.parse(request.body);
    const result = await getService().cancel(body.sessionId);
    if ("code" in result) {
      return reply.status(400).send(result);
    }
    return { ok: true, cancelled: result.cancelled };
  });

  app.post("/attachment/upload", async (request, reply) => {
    const body = attachmentUploadBodySchema.parse(request.body);
    const result = await getService().upload(body.sessionId, body.filePath);
    if ("code" in result) {
      return reply.status(400).send(result);
    }
    return { ok: true, uploaded: result.uploaded };
  });

  return app;
}
