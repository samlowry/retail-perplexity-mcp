---
name: perplexity-desktop-broker
description: >-
  Mandatory research-before-reasoning workflow. Activate whenever you need to
  think, plan, decide, design, compare options, investigate, or implement
  something non-trivial — before drawing conclusions, use MCP perplexity_ask
  (not built-in web search/crawl). If project context is unclear, explore the
  codebase first, then Perplexity with full brief, then reason. If the user
  request is self-contained, Perplexity first with all incoming info, then
  reason. Perplexity web index acts as RAG and improves thinking quality.
  User may say Perplexity as: Перп, Плекс, Плекси, Плексити, Перплексити — same MCP.
  Also when editing retail-perplexity-mcp broker/MCP code.
---

# Research before you think (Perplexity MCP)

## Names (same service)

The user may refer to this research path without saying “Perplexity”:

| Synonym | Treat as |
|---------|----------|
| Перп, Плекс, Плекси, Плексити, Перплексити | **Perplexity** → use `perplexity_ask` |

## Core rule

**Do not “think from memory” on substantive tasks.**  
Perplexity’s web index is your **primary RAG** — richer than Cursor web search, fetch, or crawl.

**Order of work:**

1. **Gather** (repo and/or user text — see workflow below)
2. **`perplexity_ask`** with a **complete research brief**
3. **Then** reason, plan, and act using Perplexity’s answer + your context

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
2. **`perplexity_ask`** — one structured question that includes:
   - **Verbatim user goal** and constraints
   - **What you found in the repo** (files, current behavior, gaps)
   - **What you need from the web** (best practices, API docs, comparisons)
3. **Then think** — plan, implement, or reply using Perplexity + repo facts.

### B — Incoming info is already clear (Perplexity first)

Use when the user gave a **self-contained** question (no deep repo archaeology needed first):

- General tech comparison, “what is X in 2026”, validate a claim, market/policy facts
- Strategy or design question where repo is irrelevant
- User pasted enough context (spec, errors, links)

**Steps:**

1. **`perplexity_ask` immediately** — pack **all** incoming info into the question (task, constraints, options, what you already assume).
2. **Then think** — reason and execute using the answer.

If mid-task you discover **project-specific** unknowns → switch to **workflow A** (quick repo scan → second `perplexity_ask` with `new_chat: true` if topic shifted).

---

## How to call Perplexity MCP

**Long research or concurrent tasks:** `perplexity_submit` → poll `perplexity_status` with `job_id` until `status: finished`. Do not hold one MCP call open for the whole generation.

**Short blocking ask:** `perplexity_ask` (waits until answer; may hit Cursor MCP client timeout before broker timeout).

| Parameter | Default | Notes |
|-----------|---------|--------|
| `question` | required | **Full brief**, not a one-liner — see template below |
| `new_chat` | `false` | `true` for unrelated topic |
| `timeout_seconds` | `900` (15 min) | Seconds; broker uses `× 1000` ms. Env `DEFAULT_TIMEOUT_MS` is ms |
| `format` | `markdown` | |
| `job_id` | — | `perplexity_status` only |

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

**Response:** `{ ok, answer, sources?, timings_ms? }` or `{ ok: false, code, message }`.

| Code | Action |
|------|--------|
| `NEEDS_LOGIN` | User logs in Camoufox window, retry |
| `BROKER_OFFLINE` | User starts broker from repo root (see below) |
| `BUSY` | Wait; one ask at a time |
| `TIMEOUT` | Narrow question or raise `timeout_seconds`; use submit+status for long jobs |
| `RATE_LIMITED` | Back off and retry later |
| `UI_CHANGED` | Perplexity DOM changed; report to maintainer |
| `FAILED` | Report; retry once if transient |

Do **not** use removed MCP tools (`perplexity_health`, `perplexity_ensure_session`, …).

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

Cursor → `perplexity_submit` / `perplexity_status` / `perplexity_ask` → broker `:3317` → Playwright → Camoufox → Perplexity UI.

Packages: `apps/broker`, `apps/mcp-server`, `packages/playwright-worker`, `packages/ui-selectors`, `packages/ui-state`, `packages/core`, `packages/types`.

Agents: prefer **`perplexity_submit` + `perplexity_status`** for long waits; HTTP `GET /job/:id` polls UI for dev.

Coding skills: `playwright-best-practices`, `mcp-builder`, `fastify-best-practices`, `nodejs-backend-patterns`.
