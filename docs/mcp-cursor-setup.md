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

3. Restart Cursor and verify MCP tools: `perplexity_submit_question`, `perplexity_get_answer`.

## Two-command flow

1. **`perplexity_submit_question`** — `question` + optional **`chat_id`**. Returns **`chat_id`** (Perplexity thread URL) when the prompt is on the page.
2. **`perplexity_get_answer`** — same **`chat_id`** until `completed` or `error`.

### Chat targeting

| `chat_id` on submit | Behavior |
|---------------------|----------|
| **Omitted** | New Perplexity topic |
| **Set** (full URL or slug from prior submit) | Follow-up in that chat; broker opens the thread only if the tab is on another page |

Poll every few seconds. No broker job store or timeout — you decide when to stop.

## MCP tools

| Tool | Purpose |
|------|---------|
| `perplexity_submit_question` | Send question; returns `chat_id` |
| `perplexity_get_answer` | Status + `result` / errors by `chat_id` |

Session bootstrap runs inside the broker; `session_id` is always `default` and is not exposed on MCP.

### `perplexity_submit_question` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `question` | string | (required) | Prompt (broker appends in-chat-only instruction block on send) |
| `chat_id` | string | — | Thread URL or slug; **omit for new topic** |
| `format` | `markdown` \| `text` | `markdown` | Answer format when completed |

### `perplexity_get_answer` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `chat_id` | string | (required) | From `perplexity_submit_question` (URL or slug) |
| `format` | `markdown` \| `text` | `markdown` | Answer format when completed |

### Response JSON (text content)

Submit success:

```json
{ "ok": true, "chat_id": "https://www.perplexity.ai/search/…", "status": "running" }
```

Status while running:

```json
{ "ok": true, "chat_id": "https://…", "status": "running", "visible_chars": 1204 }
```

Status when completed:

```json
{ "ok": true, "chat_id": "https://…", "status": "completed", "result": "…", "timings_ms": { … } }
```

Status when Perplexity/UI error:

```json
{ "ok": true, "chat_id": "https://…", "status": "error", "code": "NEEDS_LOGIN", "error_message": "…" }
```

Broker unreachable:

```json
{ "ok": false, "code": "BROKER_OFFLINE", "message": "…" }
```

`visible_chars` — length of answer text visible on the page (compare across polls for progress).

HTTP: `/health`, `/chat/send`, `/thread/status` on the broker.
