import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { detectUiState } from "../src/detector.js";
import { UiState } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../__fixtures__");

describe("detectUiState on HTML fixtures", () => {
  let browser: Awaited<ReturnType<typeof chromium.launch>>;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  async function loadFixture(name: string) {
    const html = await readFile(join(fixturesDir, name), "utf-8");
    const page = await browser.newPage();
    await page.setContent(html);
    return page;
  }

  it("detects login required", async () => {
    const page = await loadFixture("login-required.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.AUTH_EXPIRED);
  });

  it("detects generating", async () => {
    const page = await loadFixture("generating.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.GENERATING);
  });

  it("detects complete", async () => {
    const page = await loadFixture("complete.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.COMPLETE);
  });

  it("detects complete on lexical follow-up input (Perplexity 2025+)", async () => {
    const page = await loadFixture("complete-lexical.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.COMPLETE);
  });

  it("detects complete on thread page with answer only (no home prompt)", async () => {
    const page = await loadFixture("complete-thread-answer-only.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.COMPLETE);
  });

  it("detects rate limited", async () => {
    const page = await loadFixture("rate-limit.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.RATE_LIMITED);
  });

  it("treats stop button as generating when answer mentions rate limiting", async () => {
    const page = await loadFixture("generating-rate-limit-topic.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.GENERATING);
  });

  it("detects generating on follow-up thread with prior answer still visible", async () => {
    const page = await loadFixture("generating-followup-thread.html");
    const result = await detectUiState(page);
    await page.close();
    expect(result.state).toBe(UiState.GENERATING);
  });
});
