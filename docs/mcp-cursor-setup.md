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

3. Restart Cursor and verify MCP tools: `perplexity_submit`, `perplexity_status`.

## Two-command flow

1. **`perplexity_submit`** — sends the prompt; returns **`thread_url`** when submit finished (sync until Perplexity thread URL is known). MCP does not wait for the full answer.
2. **`perplexity_status`** — pass the same **`thread_url`**; broker opens that thread if needed, reads UI, returns status and payload in one call.

Poll every few seconds until `status` is `completed` or `error`. No broker-side job list or timeout — the agent decides when to stop polling.

## MCP tools

| Tool | Purpose |
|------|---------|
| `perplexity_submit` | Submit question; returns `thread_url` (task id) |
| `perplexity_status` | Status + result/error/visible_chars by `thread_url` |

Session bootstrap runs inside the broker; `session_id` is always `default` and is not exposed on MCP.

### `perplexity_submit` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `question` | string | (required) | Prompt text |
| `new_chat` | boolean | `false` | Start a new Perplexity thread before sending |
| `format` | `markdown` \| `text` | `markdown` | Answer format when completed |

### `perplexity_status` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `thread_url` | string | (required) | URL from `perplexity_submit` |
| `format` | `markdown` \| `text` | `markdown` | Answer format when completed |

### Response JSON (text content)

Submit success:

```json
{ "ok": true, "thread_url": "https://www.perplexity.ai/search/…", "status": "running" }
```

Status while running:

```json
{ "ok": true, "thread_url": "https://…", "status": "running", "visible_chars": 1204 }
```

Status when completed:

```json
{ "ok": true, "thread_url": "https://…", "status": "completed", "result": "…", "timings_ms": { … } }
```

Status when Perplexity/UI error:

```json
{ "ok": true, "thread_url": "https://…", "status": "error", "code": "NEEDS_LOGIN", "error_message": "…" }
```

Broker unreachable (tool failure):

```json
{ "ok": false, "code": "BROKER_OFFLINE", "message": "…" }
```

Agent-facing error codes: `NEEDS_LOGIN`, `BROKER_OFFLINE`, `BUSY`, `RATE_LIMITED`, `UI_CHANGED`, `FAILED`.

`visible_chars` is the length of answer text visible on the page — compare across polls to see progress.

HTTP routes: `/health`, `/chat/send`, `/thread/status`, etc. on the broker for doctor and development.
