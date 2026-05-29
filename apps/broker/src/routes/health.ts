import type { FastifyInstance } from "fastify";
import { getService } from "../service-holder.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => getService().getHealth());
}
