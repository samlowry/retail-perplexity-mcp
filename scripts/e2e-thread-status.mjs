#!/usr/bin/env node
/**
 * Quick E2E: POST /chat/send then POST /thread/status until completed or error.
 */
const BASE = process.env.BROKER_BASE ?? "http://127.0.0.1:3317";
const POLL_MS = Number(process.env.POLL_MS ?? 5000);
const MAX_POLLS = Number(process.env.MAX_POLLS ?? 24);

const questions = [
  {
    label: "short-fact",
    text: "What is the capital of Estonia? Reply in one short sentence only.",
    newThread: true,
  },
  {
    label: "tiny-math",
    text: "What is 17 * 23? Reply with the number only.",
    newThread: true,
  },
];

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

async function pollUntilDone(threadUrl, label) {
  for (let i = 1; i <= MAX_POLLS; i++) {
    const st = await post("/thread/status", {
      sessionId: "default",
      threadUrl,
      responseFormat: "text",
    });
    const chars = st.visibleChars ?? "-";
    console.log(`  [${label}] poll ${i}: status=${st.status} visible_chars=${chars}`);
    if (st.status === "completed") {
      const preview = (st.answer?.answerText ?? "").slice(0, 200);
      console.log(`  [${label}] RESULT: ${preview}`);
      return { ok: true, polls: i, preview };
    }
    if (st.status === "error") {
      console.log(`  [${label}] ERROR:`, st.error ?? st);
      return { ok: false, polls: i, error: st.error };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return { ok: false, polls: MAX_POLLS, error: "max polls exceeded" };
}

async function main() {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log("health:", health);
  if (!health.ok) process.exit(1);

  const results = [];
  for (const q of questions) {
    console.log(`\n=== ${q.label}: submit ===`);
    const t0 = Date.now();
    const sub = await post("/chat/send", {
      sessionId: "default",
      text: q.text,
      newThread: q.newThread,
    });
    console.log(`  thread_url: ${sub.threadUrl}`);
    console.log(`  submit_ms: ${Date.now() - t0}`);
    const out = await pollUntilDone(sub.threadUrl, q.label);
    results.push({ label: q.label, ...out, total_ms: Date.now() - t0 });
  }

  console.log("\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`${r.label}: ${r.ok ? "PASS" : "FAIL"} polls=${r.polls} total_ms=${r.total_ms}`);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
