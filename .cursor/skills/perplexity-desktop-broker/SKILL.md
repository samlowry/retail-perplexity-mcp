---
name: perplexity-desktop-broker
description: >-
  Mandatory research-before-reasoning workflow. Activate whenever you need to
  think, plan, decide, design, compare options, investigate, or implement
  something non-trivial — before drawing conclusions, use MCP perplexity_submit_question + perplexity_get_answer
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
| Перп, Плекс, Плекси, Плексити, Перплексити | **Perplexity** → use `perplexity_submit_question` / `perplexity_get_answer` |

## Core rule

**Do not “think from memory” on substantive tasks.**  
Perplexity’s web index is your **primary RAG** — richer than Cursor web search, fetch, or crawl.

**Order of work:**

1. **Gather** (repo and/or user text — see workflow below)
2. **`perplexity_submit_question`** with a **complete research brief**, then **`perplexity_get_answer`** with the returned **`chat_id`** until `completed`
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

---

## How to call Perplexity MCP

**Two tools only** (no `perplexity_ask`; parameters are `question` and `chat_id` only):

1. **`perplexity_submit_question`** — `question` + optional **`chat_id`**. Returns **`chat_id`** (Perplexity thread URL) when the prompt is sent.
2. **`perplexity_get_answer`** — required **`chat_id`**; one call returns UI state and, when ready, **`result`**.

### `chat_id` rules (important)

| Submit `chat_id` | Meaning |
|------------------|---------|
| **Omitted** | **New topic** (broker starts a new Perplexity thread) |
| **Set** | **Same chat** — full URL from a prior submit **or** slug only (`abbc8f96-2fbf-…`). Broker opens that thread if the browser tab is elsewhere; if already on that thread, it only sends the message. |

**Follow-up in the same chat:** always pass the **`chat_id`** from the first submit (URL or slug). Never use `thread_url` — that name is removed.

Poll every few seconds until `status` is `completed` or `error`. Compare `visible_chars` across polls while `running`.

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
```

**Verify MCP build:** call `perplexity_broker_info` → must show `mcp_version` **0.4.3+** and `prompt_suffix_on_submit: true` after Reload Window.

**Submit success:** `{ "ok": true, "mcp_version": "0.4.3", "chat_id": "https://…", "status": "running", "prompt_suffix_applied": true }`

The suffix is appended **inside MCP** (not visible in the `question` arg in Cursor UI). In Perplexity the user message must end with `----` and the in-chat-only instruction.

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

Cursor → `perplexity_submit_question` / `perplexity_get_answer` → broker `:3317` → Playwright → Camoufox → Perplexity UI.

Packages: `apps/broker`, `apps/mcp-server`, `packages/playwright-worker`, `packages/ui-selectors`, `packages/ui-state`, `packages/core`, `packages/types`.

Agents: **`perplexity_submit_question`** — no `chat_id` = new topic; with `chat_id` = same chat. **`perplexity_get_answer`** reads UI by `chat_id`. HTTP `POST /chat/send`, `POST /thread/status`.

Coding skills: `playwright-best-practices`, `mcp-builder`, `fastify-best-practices`, `nodejs-backend-patterns`.
