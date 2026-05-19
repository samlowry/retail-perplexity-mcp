import { loadBrokerConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const { brokerHost, brokerPort } = loadBrokerConfig();
  const app = await createServer();

  await app.listen({ host: brokerHost, port: brokerPort });
  app.log.info(`Broker listening on http://${brokerHost}:${brokerPort}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
