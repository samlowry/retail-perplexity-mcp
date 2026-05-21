#!/usr/bin/env node
/**
 * E2E: POST /chat/send then POST /thread/status until completed or error.
 * Short smoke cases plus long research prompts that must show `running`
 * with growing visibleChars across several polls before `completed`.
 */
const BASE = process.env.BROKER_BASE ?? "http://127.0.0.1:3317";
const DEFAULT_POLL_MS = Number(process.env.POLL_MS ?? 5000);
const DEFAULT_MAX_POLLS = Number(process.env.MAX_POLLS ?? 24);
const SKIP_SMOKE = process.env.SKIP_SMOKE === "1" || process.env.SKIP_SMOKE === "true";
const ONLY_SMOKE = process.env.ONLY_SMOKE === "1" || process.env.ONLY_SMOKE === "true";
/** Pause between cases to reduce Perplexity rate-limit flakes on back-to-back long prompts. */
const CASE_DELAY_MS = Number(process.env.CASE_DELAY_MS ?? 25000);

/** @type {Array<{ label: string; text: string; kind: "short" | "long"; pollMs?: number; maxPolls?: number }>} */
const allQuestions = [
  {
    label: "short-fact",
    kind: "short",
    text: "What is the capital of Estonia? Reply in one short sentence only.",
  },
  {
    label: "tiny-math",
    kind: "short",
    text: "What is 17 * 23? Reply with the number only.",
  },
  {
    label: "long-rest-graphql",
    kind: "long",
    text:
      "Compare REST vs GraphQL for internal microservices in 2026: tradeoffs, when to pick each, 5 bullet points per side. Use clear headings and be thorough.",
    pollMs: Number(process.env.LONG_POLL_MS ?? 3000),
    maxPolls: Number(process.env.LONG_MAX_POLLS ?? 72),
  },
  {
    label: "long-crdt",
    kind: "long",
    text:
      "Explain how CRDTs work for collaborative editing, with 3 common algorithms and pros/cons for each. Multi-paragraph answer with examples.",
    pollMs: Number(process.env.LONG_POLL_MS ?? 3000),
    maxPolls: Number(process.env.LONG_MAX_POLLS ?? 72),
  },
];

const ONLY_LABEL = process.env.ONLY_LABEL?.trim();
const ONLY_FOLLOWUP = process.env.ONLY_FOLLOWUP === "1" || process.env.ONLY_FOLLOWUP === "true";

const questions = allQuestions.filter((q) => {
  if (ONLY_FOLLOWUP) return false;
  if (ONLY_LABEL) return q.label === ONLY_LABEL;
  if (ONLY_SMOKE) return q.kind === "short";
  if (SKIP_SMOKE) return q.kind === "long";
  return true;
});

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

/**
 * @param {Array<{ poll: number; status: string; visibleChars?: number; elapsedMs: number }>} history
 */
function assertLongRunningProgress(history, label) {
  const running = history.filter((h) => h.status === "running");
  if (running.length < 2) {
    throw new Error(
      `[${label}] expected >=2 running polls, got ${running.length}; history=${JSON.stringify(history)}`,
    );
  }

  const chars = running
    .map((h) => h.visibleChars)
    .filter((c) => typeof c === "number" && Number.isFinite(c));

  if (chars.length < 2) {
    throw new Error(
      `[${label}] need numeric visibleChars on >=2 running polls; got ${JSON.stringify(running)}`,
    );
  }

  const distinctCount = new Set(chars).size;
  const hasIncrease = chars.some((c, i) => i > 0 && c > chars[i - 1]);
  const monotonic = chars.every((c, i) => i === 0 || c >= chars[i - 1]);

  if (distinctCount >= 2 || (monotonic && hasIncrease)) {
    return {
      runningPolls: running.length,
      visibleCharsSeries: chars,
      distinctCount,
      monotonic,
      hasIncrease,
    };
  }

  throw new Error(
    `[${label}] visibleChars did not progress across running polls: ${chars.join(", ")}`,
  );
}

/**
 * @param {string} threadUrl
 * @param {string} label
 * @param {{ kind: "short" | "long"; pollMs?: number; maxPolls?: number }} opts
 */
async function pollUntilDone(threadUrl, label, opts) {
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const maxPolls = opts.maxPolls ?? DEFAULT_MAX_POLLS;
  const t0 = Date.now();
  /** @type {Array<{ poll: number; status: string; visibleChars?: number; elapsedMs: number }>} */
  const history = [];

  for (let i = 1; i <= maxPolls; i++) {
    const st = await post("/thread/status", {
      sessionId: "default",
      chatId: threadUrl,
      responseFormat: "text",
    });
    const elapsedMs = Date.now() - t0;
    const visibleChars =
      typeof st.visibleChars === "number" ? st.visibleChars : undefined;
    const entry = { poll: i, status: st.status, visibleChars, elapsedMs };
    history.push(entry);

    const charsLog = visibleChars ?? "-";
    console.log(
      `  [${label}] poll ${i}: status=${st.status} visible_chars=${charsLog} elapsed_ms=${elapsedMs}`,
    );

    if (st.status === "completed") {
      const preview = (st.answer?.answerText ?? "").slice(0, 200);
      console.log(`  [${label}] RESULT: ${preview}`);

      let progressProof;
      if (opts.kind === "long") {
        progressProof = assertLongRunningProgress(history, label);
        console.log(
          `  [${label}] RUNNING PROGRESS OK: polls=${progressProof.runningPolls} chars=${progressProof.visibleCharsSeries.join("→")}`,
        );
      }

      return { ok: true, polls: i, preview, history, progressProof, totalMs: elapsedMs };
    }

    if (st.status === "error") {
      console.log(`  [${label}] ERROR:`, st.error ?? st);
      return { ok: false, polls: i, error: st.error, history, totalMs: elapsedMs };
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  return {
    ok: false,
    polls: maxPolls,
    error: "max polls exceeded",
    history,
    totalMs: Date.now() - t0,
  };
}

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log("health:", health);
  if (!health.ok) process.exit(1);

  console.log(
    `suite: ${questions.map((q) => q.label).join(", ")} (poll_ms default=${DEFAULT_POLL_MS}, max_polls default=${DEFAULT_MAX_POLLS})`,
  );

  const results = [];
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    if (qi > 0 && CASE_DELAY_MS > 0) {
      console.log(`\n--- waiting ${CASE_DELAY_MS}ms before next case ---`);
      await new Promise((r) => setTimeout(r, CASE_DELAY_MS));
    }
    console.log(`\n=== ${q.label} (${q.kind}): submit ===`);
    const t0 = Date.now();
    const sub = await post("/chat/send", {
      sessionId: "default",
      text: q.text,
    });
    console.log(`  thread_url: ${sub.threadUrl}`);
    console.log(`  submit_ms: ${Date.now() - t0}`);
    const out = await pollUntilDone(sub.threadUrl, q.label, {
      kind: q.kind,
      pollMs: q.pollMs,
      maxPolls: q.maxPolls,
    });
    results.push({ label: q.label, kind: q.kind, ...out });
  }

  if (ONLY_FOLLOWUP || (!ONLY_LABEL && !ONLY_SMOKE)) {
    console.log("\n=== followup-same-chat: submit with chat_id ===");
    const seed = await post("/chat/send", {
      sessionId: "default",
      text: "Say hello in exactly one word.",
    });
    const seedOut = await pollUntilDone(seed.threadUrl, "followup-seed", {
      kind: "short",
      maxPolls: 12,
    });
    if (!seedOut.ok) {
      results.push({ label: "followup-same-chat", kind: "short", ...seedOut });
    } else {
      const slug = seed.threadUrl.replace(/.*\/search\//, "");
      const sub2 = await post("/chat/send", {
        sessionId: "default",
        text: "Now reply with only the word PONG.",
        chatId: slug,
      });
      if (sub2.threadUrl !== seed.threadUrl) {
        throw new Error(
          `followup chat_id should stay on same thread: ${sub2.threadUrl} vs ${seed.threadUrl}`,
        );
      }
      const out2 = await pollUntilDone(sub2.threadUrl, "followup-same-chat", {
        kind: "short",
        maxPolls: 12,
      });
      results.push({ label: "followup-same-chat", kind: "short", ...out2 });
    }
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    const progress =
      r.progressProof != null
        ? ` running_chars=${r.progressProof.visibleCharsSeries.join("→")}`
        : "";
    console.log(
      `${r.label} (${r.kind}): ${r.ok ? "PASS" : "FAIL"} polls=${r.polls} total_ms=${r.totalMs ?? "-"}${progress}`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} case(s) failed`);
    process.exit(1);
  }
  console.log("\nAll cases passed");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
