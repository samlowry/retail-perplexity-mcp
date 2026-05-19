import { loadConfig } from "../src/config-loader.js";
import { PlaywrightWorker } from "../src/worker.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const worker = new PlaywrightWorker(config);

  console.log("Ensuring session (log in manually if prompted)...");
  const session = await worker.ensureSession();
  if (!session.loggedIn) {
    console.error(session.error);
    process.exit(1);
  }

  console.log("Sending prompt...");
  const result = await worker.sendPromptAndWait("What is 2+2? Reply with just the number.", {
    newThread: true,
    responseFormat: "text",
    timeoutMs: 120_000,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit("ok" in result && result.status === "completed" ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
