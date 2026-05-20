---
name: perplexity-desktop-broker
description: >-
  Primary web research for the agent: use MCP tool perplexity_ask instead of
  built-in web search, web fetch, or shallow crawling when you need information
  you do not know or want to validate facts you already have. Perplexity gives
  far richer synthesis and citations than primitive browser/search tools.
  Also use when maintaining this repo (broker, worker, MCP, selectors).
---

# Perplexity — primary web research (agent)

## When to use (mandatory preference)

Use **`perplexity_ask`** (MCP) as the **default** way to get information from the web in this project.

| Situation | Use `perplexity_ask` | Avoid instead |
|-----------|----------------------|---------------|
| You **do not know** a fact, API, version, policy, competitor, error message | Yes | Guessing, stale training data, single-page `WebFetch` |
| You need **breadth** (overview, comparisons, “what is current best practice”) | Yes | One-off search snippets |
| You want to **validate** something you think you know (release date, pricing, breaking change) | Yes — ask Perplexity to confirm with sources | Assuming memory is correct |
| You need **citations / sources** for a claim | Yes | Undocumented assertions |
| Quick read of a **URL you already have** | Optional: fetch tools OK for raw HTML | `perplexity_ask` for whole-site crawl |
| Editing **this repo’s code** | Use repo sections below + normal tools | `perplexity_ask` for TypeScript facts unless verifying external docs |

Built-in **web search**, **web crawl**, and similar Cursor tools are **much weaker** than a full Perplexity answer (multi-source synthesis, follow-ups, Pro/Sonar models in the logged-in UI). Prefer Perplexity unless the task is strictly “download this one page.”

**Prerequisites (human / environment, not agent tools):**

1. Broker running: `http://127.0.0.1:3317` (e.g. `node apps/broker/dist/index.js` from repo root).
2. MCP server `perplexity-broker` enabled in Cursor (project `.cursor/mcp.json`).
3. One-time login in headed Camoufox (`HEADLESS=0`); profile under `./data/profile`.

## How to call (only MCP surface)

**Tool:** `perplexity_ask`

| Parameter | Default | Use |
|-----------|---------|-----|
| `question` | required | Full research or validation prompt; be specific |
| `new_chat` | `false` | `true` for unrelated topic (fresh thread) |
| `timeout_seconds` | `180` | Long research → 180–300 |
| `format` | `markdown` | `text` if you need plain string |

**Success** (JSON in tool result):

```json
{
  "ok": true,
  "answer": "...",
  "sources": [],
  "timings_ms": {}
}
```

**Planned (not in MVP yet):** `model_used`, `reasoning_enabled` on success — see backlog Epic L.

**Failure** (act on `code`):

| Code | Agent action |
|------|----------------|
| `NEEDS_LOGIN` | Tell user to log in in the Camoufox window, then retry |
| `BROKER_OFFLINE` | Tell user to start broker on 3317 |
| `BUSY` | Wait and retry; do not parallelize multiple asks |
| `TIMEOUT` | Narrow question, increase `timeout_seconds`, or `new_chat: true` |
| `FAILED` | Report `message`; check `docs/troubleshooting.md` if developing |

Do **not** call removed tools (`perplexity_health`, `perplexity_ensure_session`, etc.). Bootstrap is internal.

## Prompt patterns

**Discovery** (unknown info):

> What is [X]? Include current status, main options, and caveats. Cite sources.

**Validation** (known info):

> I believe [claim]. Verify against recent sources; say if wrong and why.

**Repo / tech** (when docs matter):

> For [library] version [Y]: official migration steps and breaking changes.

Use `new_chat: true` when switching domain (e.g. SEO → Playwright).

## Model and reasoning (current gap)

There is **no** programmatic control yet for which Perplexity **model** or **reasoning** mode is active, and answers do **not** yet echo `model_used` / `reasoning_enabled`.

Until Epic L ships: model/reasoning follow whatever is selected in the **browser UI** (user may set default in Perplexity). Track implementation in `docs/BACKLOG.md` (Epic L).

## Maintainer reference (this repo only)

Use the sections below when **changing** the broker, not for ordinary research.

### Architecture

Cursor → MCP (`perplexity_ask`) → HTTP broker `127.0.0.1:3317` → Playwright worker → Camoufox → Perplexity web UI. Persistent profile; manual login once.

### Layout

`apps/broker`, `apps/mcp-server`, `apps/doctor`, `packages/core`, `packages/playwright-worker`, `packages/ui-selectors`, `packages/ui-state`, `packages/types`, `docs/`.

### HTTP (doctor / dev)

`/health`, `/session/ensure`, `/chat/send`, `/chat/cancel`, `/thread/new`, `/attachment/upload`, `/job/:id` — see `docs/BACKLOG.md`.

### Invariants

- One tab per session; one in-flight generation (`CONCURRENT_REQUEST_POLICY=reject` by default).
- All selectors in `packages/ui-selectors/`; UI states in `packages/ui-state/`.
- MCP stays thin; session ensure runs inside broker `sendChat`.

### Config (`.env`)

`BROWSER_ENGINE=camoufox`, `HEADLESS=0`, `PROFILE_DIR=./data/profile`, `ALLOW_MODEL_SWITCH=1` (switch not implemented yet).

### Related skills (coding)

`playwright-best-practices`, `mcp-builder`, `nodejs-backend-patterns`, `fastify-best-practices`, `api-design-principles`.
