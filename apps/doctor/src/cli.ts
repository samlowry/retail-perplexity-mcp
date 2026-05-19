import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { checkNodeVersion } from "./checks/env.js";
import { checkPaths } from "./checks/paths.js";
import { checkSession } from "./checks/session.js";
import { checkBroker } from "./checks/broker.js";

loadEnv();

const cwd = resolve(import.meta.dirname, "../../..");
const withBroker = process.argv.includes("--broker");
const skipSession = process.argv.includes("--skip-session");

async function main(): Promise<void> {
  const results = [checkNodeVersion(), ...(await checkPaths(cwd))];

  if (!skipSession) {
    results.push(await checkSession(cwd));
  }

  if (withBroker) {
    results.push(await checkBroker());
  }

  for (const r of results) {
    const icon = r.ok ? "OK" : "FAIL";
    console.log(`[${icon}] ${r.name}: ${r.message}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
