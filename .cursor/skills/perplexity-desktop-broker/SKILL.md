---
name: perplexity-desktop-broker
description: >-
  Mandatory research-before-reasoning workflow. Activate whenever you need to
  think, plan, decide, design, compare options, investigate, or implement
  something non-trivial — before drawing conclusions, use MCP perplexity_submit + perplexity_status
  (not built-in web search/crawl). If project context is unclear, explore the
  codebase first, then Perplexity with full brief, then reason. If the user
  request is self-contained, Perplexity first with all incoming info, then
  reason. Perplexity web index acts as RAG and improves thinking quality.
  User may say Perplexity as: Перп, Плекс, Плекси, Плексити, Перплексити — same MCP.
  Works globally when perplexity-broker MCP is enabled. Also when editing retail-perplexity-mcp broker/MCP code.
---

# Research before you think (Perplexity MCP)

## Names (same service)

The user may refer to this research path without saying “Perplexity”:

| Synonym | Treat as |
|---------|----------|
| Перп, Плекс, Плекси, Плексити, Перплексити | **Perplexity** → use `perplexity_submit` / `perplexity_status` |

## Core rule

**Do not “think from memory” on substantive tasks.**  
Perplexity’s web index is your **primary RAG** — richer than Cursor web search, fetch, or crawl.

**Order of work:**

1. **Gather** (repo and/or user text — see workflow below)
2. **`perplexity_submit`** with a **complete research brief**, then **`perplexity_status`** until `completed`
3. **Then** reason, plan, and act using the result + your context

Built-in web search / crawl are **fallback only** (single URL, broker offline, user says skip).

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
2. **`perplexity_submit`** — one structured question that includes:
   - **Verbatim user goal** and constraints
   - **What you found in the repo** (files, current behavior, gaps)
   - **What you need from the web** (best practices, API docs, comparisons)
3. **`perplexity_status`** with `thread_url` from step 2 — poll every few seconds until `status` is `completed` or `error`; use `result` when done.
4. **Then think** — plan, implement, or reply using the result + repo facts.

### B — Incoming info is already clear (Perplexity first)

Use when the user gave a **self-contained** question (no deep repo archaeology needed first):

- General tech comparison, “what is X in 2026”, validate a claim, market/policy facts
- Strategy or design question where repo is irrelevant
- User pasted enough context (spec, errors, links)

**Steps:**

1. **`perplexity_submit` then `perplexity_status`** — pack **all** incoming info into the question (task, constraints, options, what you already assume). Poll status until `completed` or `error`.
2. **Then think** — reason and execute using the result.

If mid-task you discover **project-specific** unknowns → switch to **workflow A** (quick repo scan → second submit with `new_chat: true` if topic shifted).

---

## How to call Perplexity MCP

**Two tools only** (no `perplexity_ask`, no `job_id`):

1. **`perplexity_submit`** — returns `thread_url` when the prompt is on the page (task id).
2. **`perplexity_status`** — pass that `thread_url`; one call returns UI state and, when ready, **`result`** in the same JSON.

Poll every few seconds until `status` is `completed` or `error`. Do not hold one MCP call open for the whole generation. Compare `visible_chars` across polls to see progress while `running`.

| Tool | Parameter | Default | Notes |
|------|-----------|---------|--------|
| `perplexity_submit` | `question` | required | **Full brief** — template below |
| `perplexity_submit` | `new_chat` | `false` | `true` for unrelated topic |
| `perplexity_submit` | `format` | `markdown` | `markdown` or `text` when completed |
| `perplexity_status` | `thread_url` | required | From submit response |
| `perplexity_status` | `format` | `markdown` | Same as submit |

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
```

**Submit success:** `{ "ok": true, "thread_url": "https://…", "status": "running" }`

**Status while running:** `{ "ok": true, "thread_url": "…", "status": "running", "visible_chars": 1204 }`

**Status completed:** `{ "ok": true, "thread_url": "…", "status": "completed", "result": "…", "sources"?, "timings_ms"? }`

**Status error (Perplexity/UI):** `{ "ok": true, "thread_url": "…", "status": "error", "code": "…", "error_message": "…" }`

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

---

## Environment (human)

Broker repo: `retail-perplexity-mcp` (this workspace).

1. Broker: `http://127.0.0.1:3317` — from **repo root**: `node apps/broker/dist/index.js`
2. MCP: `perplexity-broker` in `.cursor/mcp.json` or global `~/.cursor/mcp.json`
3. Profile: absolute `PROFILE_DIR` in `.env` (see `docs/runbook.md`)
4. Login once in headed Camoufox if `NEEDS_LOGIN`

**Planned:** `model_used` / `reasoning_enabled` in response — Epic L in `docs/BACKLOG.md`.

---

## Maintainer reference (editing this broker only)

Cursor → `perplexity_submit` / `perplexity_status` → broker `:3317` → Playwright → Camoufox → Perplexity UI.

Packages: `apps/broker`, `apps/mcp-server`, `packages/playwright-worker`, `packages/ui-selectors`, `packages/ui-state`, `packages/core`, `packages/types`.

Agents: **`perplexity_submit`** returns `thread_url`; **`perplexity_status`** reads UI (stateless, no job store). HTTP `POST /thread/status` for dev.

Coding skills: `playwright-best-practices`, `mcp-builder`, `fastify-best-practices`, `nodejs-backend-patterns`.
