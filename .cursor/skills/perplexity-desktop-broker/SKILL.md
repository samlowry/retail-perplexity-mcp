---
name: perplexity-desktop-broker
description: >-
  Build and maintain the Perplexity Desktop Broker MVP — a local Node.js +
  Playwright service that exposes HTTP JSON API and thin MCP tools for Cursor
  to control an already-logged-in Perplexity web UI via a persistent browser
  profile. Use when implementing broker/worker/MCP/doctor, Playwright selectors,
  UI state detection, job queue, session management, or debugging this repo.
---

# Perplexity Desktop Broker (MVP)

Local **reverse** integration: Cursor (or another agent) calls **your** broker; the broker drives **Perplexity consumer web UI** in a **headed** **Camoufox** (anti-detect Firefox) with a **persistent profile**. Do not assume official Perplexity server APIs or remote MCP from Perplexity to your tools.

## Non-goals (do not build in MVP)

- OpenClaw, Hermes, distributed workers, Docker-as-default, headless-first production
- Auto-login, password storage, captcha/anti-bot bypass, fleet multi-tenant hosts
- Parallel prompts on the same tab; competing agents on one session
- Business logic inside MCP tools (MCP = thin HTTP client only)

## Architecture (four layers)

1. **Agent client** — Cursor via MCP tools
2. **Local Broker** — Node.js: job queue, locks, state machine, HTTP API, structured errors
3. **Browser Worker** — Playwright: persistent context, one Perplexity tab
4. **Perplexity Web UI** — user session already established manually once

**MVP session rule:** one user, one host, one browser profile, **one active generation per session**. Second concurrent request → queue or reject (config), never race the same tab.

## Repository layout (target)

```text
perplexity-desktop-broker/
  apps/broker/          # HTTP server, job orchestration
  apps/mcp-server/      # thin MCP → broker HTTP
  apps/doctor/          # env, profile, login, reachability checks
  packages/core/        # jobs, config, errors, logging, queue
  packages/playwright-worker/
  packages/ui-selectors/   # ALL locators here only
  packages/ui-state/       # uiStateDetector only
  packages/types/          # DTOs, API contracts, error codes
  config/  data/  docs/  tests/
```

Use **pnpm workspace** unless the repo already chose otherwise.

## Browser mode (defaults)

- `HEADLESS=0` (headed) — production default for MVP
- `launchPersistentContext` + dedicated `PROFILE_DIR` (e.g. `./data/profile`)
- Fixed viewport; no aggressive anti-detection hardening
- **Never** auto-reset cookies on generic errors
- Manual first login only; broker reports `AUTH_REQUIRED` if session dead

## Selector strategy (mandatory)

Order of preference in `packages/ui-selectors/`:

1. `getByRole`, `getByLabel`, `getByPlaceholder`
2. Stable text anchors
3. Small allowlisted CSS fallbacks
4. DOM heuristics — **only** inside one isolated helper

Each locator entry: primary, fallback, `isVisible()` check, covered by integration test against real UI.

**Never** scatter selectors across broker/worker code.

## UI state detector (`packages/ui-state/`)

Must distinguish at least:

- ready for input
- generating
- generation complete
- network error, rate limit, auth expired
- confirmation dialog
- file uploading
- answer still streaming / partial render

Reliability comes from **state recognition**, not blind clicks or fixed `sleep()`.

## Job model

Fields: `job_id`, `action`, `payload`, `timeout_ms`, `idempotency_key`, `session_id`.

States: `queued` → `running` → (`waiting_user`) → `succeeded` | `failed` | `timed_out` | `cancelled`.

Success = **final structured answer returned**, not merely “click succeeded”.

## HTTP API (MVP)

Bind **`127.0.0.1` only** by default.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/session/ensure` | Launch/reuse profile, verify login |
| POST | `/chat/send` | Prompt (+ optional `new_thread`, `wait`, `response_format`) |
| POST | `/chat/cancel` | Stop generation |
| GET | `/job/:id` | Job status |
| POST | `/thread/new` | New chat |
| POST | `/attachment/upload` | File to current chat |
| GET | `/health` | Broker + browser health |

`response_format`: `text` | `markdown` | `html_fragment` | `json_best_effort`.

## MCP tools (agent surface)

**One tool for agents:** `perplexity_ask`

| Parameter | Default | Notes |
|-----------|---------|-------|
| `question` | (required) | Prompt text |
| `new_chat` | `false` | Maps to `newThread` on `/chat/send` |
| `timeout_seconds` | `180` | Maps to `timeoutMs` |
| `format` | `markdown` | `markdown` or `text` only |

Response JSON in text content: success `{ ok, answer, sources?, timings_ms? }`; failure `{ ok: false, code, message }` with codes `NEEDS_LOGIN`, `BROKER_OFFLINE`, `BUSY`, `TIMEOUT`, `FAILED`.

MCP chains `GET /health` then `POST /chat/send` (session id `default` internally). Broker `sendChat` calls `ensureSession` inside the session lock before `sendPromptAndWait`. No `session_id` exposed to agents.

Implement with `@modelcontextprotocol/sdk`; delegate to broker HTTP; no retry/state logic in MCP layer.

**Doctor/dev only (HTTP, not MCP):** `/health`, `/session/ensure`, `/thread/new`, `/chat/cancel`, `/attachment/upload`, `/job/:id`.

## Error codes (normalize all failures)

`AUTH_REQUIRED`, `SESSION_BROKEN`, `UI_CHANGED`, `PROMPT_SEND_FAILED`, `GENERATION_TIMEOUT`, `RATE_LIMITED`, `NETWORK_ERROR`, `ATTACHMENT_FAILED`, `EXTRACTION_FAILED`, `UNKNOWN_UI_STATE`.

Each error payload includes: `code`, `message`, `last_ui_state`, paths to `screenshot` and `html_snapshot` when available.

## Observability

- Structured **JSON logs**: `timestamp`, `session_id`, `job_id`, `action`, `step`, `result`, `duration_ms`
- Steps examples: `browser.launch`, `page.goto`, `auth.check`, `input.fill`, `message.submit`, `state.wait_generating`, `state.wait_complete`, `answer.extract`
- On failure: screenshot + HTML snapshot under `./data/artifacts/`
- Ring buffer: last **20** worker actions

## Config (`.env` example)

```env
BROKER_HOST=127.0.0.1
BROKER_PORT=3317
BROWSER_ENGINE=camoufox
PROFILE_DIR=./data/profile
ARTIFACTS_DIR=./data/artifacts
LOG_LEVEL=info
DEFAULT_TIMEOUT_MS=180000
HEADLESS=0
ALLOW_FILE_UPLOAD=1
ALLOW_MODEL_SWITCH=1
PERPLEXITY_URL=https://www.perplexity.ai/
```

Secrets: `.env` or OS keychain only; never commit credentials.

## Answer object (broker → agent)

Return structured payload with `thread_id`, `message_id`, `status`, `answer_text`, `answer_markdown`, `sources[]` (best effort), `timings` (`queue_ms`, `send_ms`, `generation_ms`, `extract_ms`), `artifacts` paths.

## Testing expectations

- **Unit:** config parse, job FSM, retry policy, error normalization, ui-state on HTML fixtures
- **Integration:** persistent profile boot, open Perplexity, login check, send prompt, extract answer, cancel
- **Manual acceptance:** 10 consecutive happy-path runs without profile repair

## Implementation phases

| Phase | Deliver |
|-------|---------|
| **P0** | `ensure_session`, `new_thread`, `send_prompt`, `get_last_answer` |
| **P1** | file upload, cancel, health, error artifacts, MCP adapter |
| **P2** | model/mode switch, history extraction, job queue polish, rate-limit handling |

## Platform priority

macOS first, Linux desktop second; Windows out of MVP scope.

## Related global skills

When coding this repo, also apply: `playwright-best-practices`, `mcp-builder`, `nodejs-backend-patterns`, `typescript-advanced-types`, `javascript-testing-patterns`, `fastify-best-practices` (if using Fastify), `api-design-principles`.
