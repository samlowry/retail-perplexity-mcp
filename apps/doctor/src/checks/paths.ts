import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { CheckResult } from "./env.js";

export async function checkPaths(cwd: string): Promise<CheckResult[]> {
  const profileDir = resolve(cwd, process.env.PROFILE_DIR ?? "./data/profile");
  const artifactsDir = resolve(cwd, process.env.ARTIFACTS_DIR ?? "./data/artifacts");

  const results: CheckResult[] = [];

  for (const [name, dir] of [
    ["profile_dir", profileDir],
    ["artifacts_dir", artifactsDir],
  ] as const) {
    try {
      await mkdir(dir, { recursive: true });
      await access(dir);
      results.push({ name, ok: true, message: `Writable: ${dir}` });
    } catch {
      results.push({ name, ok: false, message: `Not writable: ${dir}` });
    }
  }

  return results;
}
