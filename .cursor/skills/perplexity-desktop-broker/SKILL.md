---
name: perplexity-desktop-broker
description: >-
  Mandatory research-before-reasoning workflow. Overrides speed, todo-wave, and
  "complete the plan" pressure when publishable or implementation facts are
  required — poll perplexity_get_answer until completed before factual edits.
  Activate for think/plan/decide/design/compare/investigate/implement: use
  perplexity_submit_question + perplexity_get_answer (not built-in web search).
  If project context is unclear, explore repo first, then Perplexity brief, then
  reason; if self-contained, Perplexity first. User synonyms: Перп, Плекс,
  Плекси, Плексити, Перплексити. Also when editing retail-perplexity-mcp broker/MCP.
---

# Research before you think (Perplexity MCP)

## Names (same service)

The user may refer to this research path without saying “Perplexity”:

| Synonym | Treat as |
|---------|----------|
| Перп, Плекс, Плекси, Плексити, Перплексити | **Perplexity** → use `perplexity_submit_question` / `perplexity_get_answer` |

## Core rule

**Do not “think from memory” on substantive tasks.**  
Perplexity’s web index is your **primary RAG** — richer than Cursor web search, fetch, or crawl.

**Order of work:**

1. **Gather** (repo and/or user text — see workflow below)
2. **`perplexity_submit_question`** with a **complete research brief**, then **`perplexity_get_answer`** with the returned **`chat_id`** until `completed`
3. **Then** reason, plan, and act using the result + your context

Built-in web search / crawl are **fallback only** (single URL, broker offline, user says skip).

### Priority and conflicts

When this skill applies, it **outranks**:

- “Do not stop until all todos / waves are done”
- `use-md-files-as-a-planning-memory` wave closure before research finishes
- Visible progress (many file edits, build green) without a completed poll

If a plan says “Perplexity before each wave” **and** lists N factual files: **one** submit + poll to `completed` for the fact pack (workflow C), **then** batch edits — not “wave without Perplexity because a stale pack exists”.

### Hard gates (MUST NOT)

After `perplexity_submit_question` returns `status: "running"`:

- **MUST NOT** edit user-visible files that contain **external facts** (dates, records, H2H, heights, tables, `data-snapshot` stats) until `perplexity_get_answer` returns `status: "completed"` or `status: "error"`.
- **MUST NOT** commit, run release build, or mark research-related todos **done** while still `running`.
- **MUST NOT** treat `docs/perplexity-fact-packs-result.md` (or any repo fact pack) as a substitute for a fresh submit+poll in **this** task unless the user explicitly allows a stale pack.
- **MUST NOT** cite model memory for publishable numbers when `result` lacks that field.

Repo exploration, scaffolding without facts, and local refactors **without** new external claims are allowed while `running`.

### Sources hierarchy (publishable facts)

| Priority | Source |
|----------|--------|
| 1 | `perplexity_get_answer` → `result` (**this task**, after `completed`) |
| 2 | Official URLs in `sources[]` from that response |
| 3 | `docs/perplexity-fact-packs-result.md` or similar packs — **hint only**; verify via 1–2 |
| 4 | Model memory — **forbidden** for publishable stats |

On conflict between pack and fresh `result`, **Perplexity `result` wins** for published content.

---

## When this skill applies (activate every time)

Use this workflow when the task involves **any** of:

- Planning, architecture, tradeoffs, “how should we…”
- Facts you are not 100% sure about (versions, APIs, policies, best practices)
- Validating a belief before committing code or advice
- Comparing tools, libraries, approaches
- Debugging unclear errors (especially external services)
- Implementation that depends on **current** web/docs reality
- Any non-trivial answer where being wrong is costly

**Skip Perplexity only when:** purely local edit with full context in front of you (rename, format, obvious typo), or user explicitly says no research, or `BROKER_OFFLINE` and user accepts proceed without web RAG.

---

## Choose workflow A or B

### A — Project context not obvious (search the repo first)

Use when the task depends on **this codebase** and you do not yet have the picture:

- “Fix X in the broker”, “add feature like Y here”, “why does our worker…”
- User points at a repo path or uses project-specific names without full spec
- You need conventions, existing modules, env, or how something is wired today

**Steps:**

1. **Explore project** — search/read files, `BACKLOG.md`, architecture, related code; collect facts (paths, patterns, constraints).
2. **`perplexity_submit_question`** — one structured question that includes:
   - **Verbatim user goal** and constraints
   - **What you found in the repo** (files, current behavior, gaps)
   - **What you need from the web** (best practices, API docs, comparisons)
3. **`perplexity_get_answer`** with the same `chat_id` from step 2 — poll until `completed` or `error`; use `result` when done.
4. **Then think** — plan, implement, or reply using the result + repo facts.

### B — Incoming info is already clear (Perplexity first)

Use when the user gave a **self-contained** question (no deep repo archaeology needed first):

- General tech comparison, “what is X in 2026”, validate a claim, market/policy facts
- Strategy or design question where repo is irrelevant
- User pasted enough context (spec, errors, links)

**Steps:**

1. **`perplexity_submit_question` then `perplexity_get_answer`** — pack **all** incoming info into the question (task, constraints, options, what you already assume). Poll status until `completed` or `error`.
2. **Then think** — reason and execute using the result.

If mid-task you discover **project-specific** unknowns → switch to **workflow A** (quick repo scan → second submit **without** `chat_id` if the topic is new).

### C — Fact-driven bulk content (plan + many factual files)

Use when implementing a plan like “rewrite N pages with verified facts” (not pure A, not single-question B):

1. **Read** plan + entity list; do **not** start factual MDX edits from pack/memory alone.
2. **One** `perplexity_submit_question` with the **full entity list** as **Task 1…N** in a single brief (see **Multiple tasks in one submit**).
3. **Poll** until `completed` (algorithm below) — **mandatory** before any factual file edit.
4. **Map** `result` → file paths / table rows; note gaps explicitly.
5. **Then** edit files in batch; one build/check after the batch if the plan requires it.

Multiple submits are allowed only when the brief truly splits topics; never parallel implementation while any related submit is still `running`.

---

## How to call Perplexity MCP

### MCP tools (only these two)

Do **not** call health checks or any other MCP tool before research. Use only:

**Two tools only** (no `perplexity_ask`, no `perplexity_broker_info`; parameters are `question` and `chat_id` only):

1. **`perplexity_submit_question`** — `question` + optional **`chat_id`**. Returns **`chat_id`** (Perplexity thread URL) when the prompt is sent.
2. **`perplexity_get_answer`** — required **`chat_id`**; one call returns UI state and, when ready, **`result`**.

### `chat_id` rules (important)

| Submit `chat_id` | Meaning |
|------------------|---------|
| **Omitted** | **New topic** (broker starts a new Perplexity thread) |
| **Set** | **Same chat** — full URL from a prior submit **or** slug only (`abbc8f96-2fbf-…`). Broker opens or **reloads** that thread before send/status (unfreezes stuck UI). |

**Follow-up in the same chat:** always pass the **`chat_id`** from the first submit (URL or slug). Never use `thread_url` — that name is removed.

### Multiple tasks in one submit (preferred for bulk research)

You **can** assign several research jobs in a **single** `perplexity_submit_question` — one poll to `completed`, one `result` to parse. This is the usual way for workflow C and multi-entity fact packs.

**How to structure `question`:**

- Use a short **Context** once, then numbered **Task 1 / Task 2 / …** (or grouped tables per entity).
- For each task state: **inputs**, **required fields**, **output shape** (table columns, bullets, citations).
- Ask for a **single combined answer** with clear headings per task so you can map sections → files or todos.

**Example fragment:**

```text
Context: UFC fighter pages, publishable stats only with sources.

Task 1 — Shavkat Rakhmonov: UFC record, height, last 7 fights (table).
Task 2 — …
Task 3 — …

Output: one markdown doc with ## Task 1, ## Task 2, … and source links per table.
```

**Broker limits (do not confuse with “parallel tasks”):**

- One browser session runs **one in-flight generation** at a time. A second overlapping `submit`/poll while the first is still running returns **`BUSY` immediately** (no queue) — **do not** fire multiple `submit` calls and implement from whichever finishes first.
- **Wrong:** three separate `submit` (three `chat_id`) for the same fact wave, then edit while any is `running`.
- **Right:** one compound `question` **or** strictly **serial** submit → poll `completed` → next submit.

Follow-up refinements on the **same** research use the **same** `chat_id` (additional user message in that Perplexity thread), not a duplicate submit of the full brief.

### Long runs: reasoning and silent periods

Complex briefs (deep comparison, multi-step plans, “think like sub-agents”, many entities, strict output schema) often take **10–15 minutes** in Perplexity — within the normal **20-minute** poll window.

While `status` is **`running`**:

- Perplexity may show **little or no answer text** for a long time — internal **reasoning**, search, or modular steps run **before** the visible reply streams.
- **`visible_chars` may be `0` or flat** across several polls (e.g. 2–10 minutes). That is **not** automatic failure and **not** permission to implement from memory.
- Keep polling on schedule; tell the user *“Perplexity still reasoning / no visible answer yet (~Nm), continuing poll…”*.
- Treat as **stuck** only if `visible_chars` is unchanged for **many** polls **and** you are past the **15-minute** poll — then note it in the reply; still prefer `get_answer` over re-submit until `error` or user aborts.

**Agent:** do not stop after one early `get_answer` with `visible_chars: 0`. Do not mark research done or open factual edits until `completed`.

### Polling loop (agent algorithm — same session)

`submit` starts one in-flight run and returns `status: "running"` (not a result). `status: "running"` means **zero verified `result`**. Waiting is **several sequential `get_answer` calls**, not one optional check.

1. **`perplexity_submit_question`** → save **`chat_id`** in the reply (repeat in the next user-visible message if the session may summarize).
2. **Do not** open the implementation branch (no factual MDX, no “wave done”, no build for publishable output).
3. **Poll schedule** — call **`perplexity_get_answer`** only at these elapsed times from submit (shell `sleep` between tool rounds). **Do not** poll at 30 s, 1 min, or other intervals.

| Poll | Elapsed from submit | Wait before this poll (from previous step) |
|------|---------------------|---------------------------------------------|
| 1 | **2 min** | `sleep 120` after submit |
| 2 | **3 min** | `sleep 60` |
| 3 | **5 min** | `sleep 120` |
| 4 | **10 min** | `sleep 300` |
| 5 | **15 min** | `sleep 300` |
| 6 | **20 min** | `sleep 300` |

4. After each poll while `running`: tell the user *“Perplexity still running, next poll at ~Nm…”* (use the next row’s elapsed time). Stop the schedule on **`completed`** / **`error`** (success early is fine).
5. **Only on `completed`:** parse `result` → then edit/commit/mark research todos.
6. **Interrupted poll** (user message, context cut, sleep aborted): **resume** with `get_answer(same chat_id)` — pick up the **next** due poll from the table (by elapsed time since submit), **never** re-submit the same research brief; incomplete poll = **unfinished research**, not “continue from memory”.
7. While `running`, compare **`visible_chars`** across polls; expect **long flat periods** on hard briefs (see **Long runs** above) before calling stuck.

Do not poll more often than this schedule unless the user asks for faster checks.

Perplexity web UI can freeze; each `perplexity_get_answer` reloads/opens the thread before reading UI.

| Tool | Parameter | Default | Notes |
|------|-----------|---------|--------|
| `perplexity_submit_question` | `question` | required | Full brief (MCP appends: answer in chat, no files) |
| `perplexity_submit_question` | `chat_id` | — | Omit = new topic; set = continue that chat |
| `perplexity_submit_question` | `format` | `markdown` | `markdown` or `text` |
| `perplexity_get_answer` | `chat_id` | required | Same id returned by submit |
| `perplexity_get_answer` | `format` | `markdown` | Same as submit |

**Research brief template** (paste and fill):

```text
Context: [user task, constraints, deadline, stack if known]

What I already know:
- [from user message]
- [from repo exploration, if workflow A]

Research needed:
- [specific questions]
- [verify / disprove assumptions]

Output: [bullet summary / comparison table / step-by-step / citations]

# Optional — multiple tasks in one submit:
Task 1: [scope + required fields + output shape]
Task 2: …
Ask for ## Task N headings in one combined answer.
```

**MCP version / suffix:** read `mcp_version` and `prompt_suffix_applied` from the **submit** response (no separate info tool).

**Submit success:** `{ "ok": true, "mcp_version": "0.4.5", "chat_id": "https://…", "status": "running", "prompt_suffix_applied": true, "next_step": "…" }`

The suffix is appended in the **broker** on every `/chat/send` (MCP and HTTP). It is not visible in the Cursor `question` arg. In Perplexity the user bubble must include `[Instruction — reply in this chat only]` and the no-files line — **do not** use `----` as a separator (Perplexity hides the tail).

**Status while running:** `{ "ok": true, "chat_id": "…", "status": "running", "visible_chars": 1204 }`

**Status completed:** `{ "ok": true, "chat_id": "…", "status": "completed", "result": "…", "sources"?, "timings_ms"? }`

**Status error (Perplexity/UI):** `{ "ok": true, "chat_id": "…", "status": "error", "code": "…", "error_message": "…" }`

**Tool failure (broker down, etc.):** `{ "ok": false, "code": "…", "message": "…" }`

| Code | When | Action |
|------|------|--------|
| `NEEDS_LOGIN` | `status: error` or `ok: false` | User logs in Camoufox window, retry |
| `BROKER_OFFLINE` | `ok: false` | Start broker (see below); Reload Window in Cursor |
| `BUSY` | `ok: false` | Wait; broker serializes browser ops |
| `RATE_LIMITED` | `status: error` | Back off and retry later |
| `UI_CHANGED` | `status: error` | Perplexity DOM changed; report to maintainer |
| `FAILED` | other | Report; retry once if transient |

Do **not** use removed tools (`perplexity_ask`, `perplexity_health`, `perplexity_ensure_session`, …).

**Submit success** may include `next_step`: always follow it — answers stay invalid until `get_answer` returns `completed`.

### Anti-pattern vs correct pattern

**Wrong (do not do this):**

```text
perplexity_submit_question → status "running"
→ immediately Write shavkat-rakhmonov.mdx with fight list from memory
→ build → mark todos done
```

Why wrong: `running` = no `result`. UFC-only record (e.g. 7-0) vs pro total (e.g. 19-0) and height (e.g. 185 cm) are easy to confuse without `result`.

**Correct:**

```text
submit → poll until completed → extract table from result → edit MDX from result/sources only → build
```

### Publishing rule (factual content)

Numbers in tables, `data-snapshot`, or body copy must come from **`result`** or an official link in **`sources[]`**. If the field is missing in `result`, **do not invent** — omit the row or use neutral “check official …” copy in footer only, not in stat tables.

### Resume after interrupt

On a new turn after interrupt or summary loss:

1. Find the last **`chat_id`** in the transcript.
2. Call **`perplexity_get_answer`** first — do **not** duplicate `submit` for the same brief.
3. Continue the polling loop from step 3 until `completed` or `error`.

---

## Environment (human)

Broker repo: `retail-perplexity-mcp` (this workspace).

1. Broker: `http://127.0.0.1:3317` — from **repo root**: `node apps/broker/dist/index.js`
2. MCP: `perplexity-broker` in `.cursor/mcp.json` or global `~/.cursor/mcp.json`
3. Profile: absolute `PROFILE_DIR` in `.env` (see `docs/runbook.md`)
4. Login once in headed Camoufox if `NEEDS_LOGIN`

**Model metadata:** `perplexity_submit_question` returns `submit_model` and `submit_reasoning_enabled` (compose form at send). `perplexity_get_answer` when `completed` returns `prepared_using` (from “Prepared using …” attribution). Not present on `running` polls.

---

## Maintainer reference (editing this broker only)

Cursor → `perplexity_submit_question` / `perplexity_get_answer` → broker `:3317` → Playwright → Camoufox → Perplexity UI.

Packages: `apps/broker`, `apps/mcp-server`, `packages/playwright-worker`, `packages/ui-selectors`, `packages/ui-state`, `packages/core`, `packages/types`.

Agents: **`perplexity_submit_question`** — no `chat_id` = new topic; with `chat_id` = same chat. **`perplexity_get_answer`** reads UI by `chat_id`. HTTP `POST /chat/send`, `POST /thread/status`.

Coding skills: `playwright-best-practices`, `mcp-builder`, `fastify-best-practices`, `nodejs-backend-patterns`.
