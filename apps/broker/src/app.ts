import Fastify from "fastify";
import helmet from "@fastify/helmet";
import { loadBrokerConfig } from "./config.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSessionRoutes } from "./routes/session.js";
import { registerThreadRoutes } from "./routes/thread.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerAttachmentRoutes } from "./routes/attachment.js";

/** Create Fastify instance with all MVP routes. */
export async function createServer() {
  const { logLevel } = loadBrokerConfig();
  const app = Fastify({ logger: { level: logLevel } });

  await app.register(helmet, { contentSecurityPolicy: false });
  await registerErrorHandler(app);
  await registerHealthRoutes(app);
  await registerSessionRoutes(app);
  await registerThreadRoutes(app);
  await registerChatRoutes(app);
  await registerAttachmentRoutes(app);

  return app;
}
