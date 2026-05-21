# Cursor MCP setup

## Global (all projects)

Installed for this machine:

- **MCP:** `~/.cursor/mcp.json` — server `perplexity-broker` with **absolute** path to `apps/mcp-server/dist/index.js` (Cursor may ignore `cwd`)
- **Skill:** `~/.cursor/skills/perplexity-desktop-broker/SKILL.md`

Broker must still run from this repo (`node apps/broker/dist/index.js`). Profile and Camoufox state live in `./data/profile` here.

After changes: **Reload Window** in Cursor so MCP/skills refresh.

## Project-only (optional duplicate)

1. Start the broker: `pnpm dev:broker`
2. Add to `.cursor/mcp.json` in your project or user config:

```json
{
  "mcpServers": {
    "perplexity-broker": {
      "command": "pnpm",
      "args": ["--filter", "@pdb/mcp-server", "dev"],
      "cwd": "/absolute/path/to/retail-perplexity-mcp",
      "env": {
        "BROKER_HOST": "127.0.0.1",
        "BROKER_PORT": "3317"
      }
    }
  }
}
```

3. Restart Cursor and verify MCP tools: `perplexity_submit`, `perplexity_status`, and `perplexity_ask`.

## Two-phase flow (recommended for long research)

1. **`perplexity_submit`** — send the question; returns `job_id` immediately (MCP does not wait for generation).
2. **`perplexity_status`** — poll with `job_id` until `status` is `finished` (or handle errors). The broker opens the stored Perplexity thread URL when polling a different topic.

Use this for waits longer than ~60 seconds, multiple concurrent generations, or when Cursor’s own MCP client timeout is a concern.

**`perplexity_ask`** still blocks until the answer is ready (same HTTP path with `wait: true`). Prefer submit + status for long jobs.

## MCP tools

| Tool | Purpose |
|------|---------|
| `perplexity_submit` | Start generation; returns `job_id` |
| `perplexity_status` | Poll by `job_id`; `generating` or `finished` |
| `perplexity_ask` | Blocking ask (legacy/convenience) |

Session bootstrap runs inside the broker; `session_id` is always `default` and is not exposed on MCP.

### `perplexity_submit` / `perplexity_ask` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `question` | string | (required) | Prompt text |
| `new_chat` | boolean | `false` | Start a new Perplexity thread before sending |
| `timeout_seconds` | number | `900` (15 min) | Max time allowed for generation (see timeouts below) |
| `format` | `markdown` \| `text` | `markdown` | Answer format |

### `perplexity_status` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `job_id` | string | (required) | Id from `perplexity_submit` (e.g. `job_a1b2c3d4e5f6`) |
| `format` | `markdown` \| `text` | `markdown` | Answer format when finished |

### Success / failure JSON (text content)

Submit success:

```json
{ "ok": true, "job_id": "job_…", "status": "generating" }
```

Status while running:

```json
{ "ok": true, "job_id": "job_…", "status": "generating", "thread_url": "https://…" }
```

Status when done:

```json
{ "ok": true, "job_id": "job_…", "status": "finished", "answer": "…", "timings_ms": { … } }
```

Failure:

```json
{ "ok": false, "code": "…", "message": "…", "job_id": "job_…" }
```

Agent-facing error codes: `NEEDS_LOGIN`, `BROKER_OFFLINE`, `BUSY`, `TIMEOUT`, `RATE_LIMITED`, `UI_CHANGED`, `FAILED`.

## Timeouts (important)

| Setting | Unit | Default | Meaning |
|---------|------|---------|---------|
| MCP `timeout_seconds` | **seconds** | `900` | Max generation time for that job; broker marks `TIMED_OUT` after this many ms from job creation |
| `DEFAULT_TIMEOUT_MS` (`.env`) | **milliseconds** | `900000` | Broker default when `timeoutMs` omitted on HTTP (`900` s = 15 min) |
| `config/default.json` `defaultTimeoutMs` | **milliseconds** | `900000` | Same as env default for local config |

There is **no** `PERPLEXITY_*` timeout env var — only `DEFAULT_TIMEOUT_MS`. Values are always ms in env/config and seconds in MCP.

**Not the same as Cursor’s MCP timeout:** Cursor may abort a tool call independently (often much sooner than 15 minutes). That is why `perplexity_submit` + `perplexity_status` avoid holding one MCP call open for the whole generation.

Previously defaults were `600` seconds / `600000` ms (10 minutes); they are now 15 minutes unless you override.

HTTP routes (`/health`, `/chat/send`, `GET /job/:id`, etc.) remain on the broker for doctor and development.
