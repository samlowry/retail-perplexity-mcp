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

Concurrency model: one in-flight request per session. If a second submit/poll overlaps, broker returns `BUSY` immediately (no FIFO queue); keep polling the original `chat_id`.

### Chat targeting

| `chat_id` on submit | Behavior |
|---------------------|----------|
| **Omitted** | New Perplexity topic |
| **Set** (full URL or slug from prior submit) | Follow-up in that chat; broker opens the thread only if the tab is on another page |

Poll every few seconds. No broker job store or timeout — you decide when to stop.

## MCP tools

| Tool | Purpose |
|------|---------|
| `perplexity_submit_question` | Send question; returns `chat_id` + compose-form model fields |
| `perplexity_get_answer` | Status + `result` / errors by `chat_id`; `prepared_using` when `completed` |

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

Submit success (includes compose-form metadata; values may be `null` if the UI did not expose them):

```json
{
  "ok": true,
  "mcp_version": "0.5.0",
  "chat_id": "https://www.perplexity.ai/search/…",
  "status": "running",
  "submit_model": "GPT-5.4",
  "submit_reasoning_enabled": null,
  "prompt_suffix_applied": true,
  "next_step": "Call perplexity_get_answer with this chat_id until completed."
}
```

Status while running (no `prepared_using` yet):

```json
{ "ok": true, "chat_id": "https://…", "status": "running", "visible_chars": 1204 }
```

Status when completed (`prepared_using` only here — not on `running` polls):

```json
{
  "ok": true,
  "chat_id": "https://…",
  "status": "completed",
  "result": "…",
  "prepared_using": "GPT-5.4",
  "sources": [],
  "timings_ms": { "extract_ms": 120 }
}
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

### Model metadata fields

| Field | When present | Meaning |
|-------|----------------|---------|
| `submit_model` | Submit response | Model label on the compose form at send time |
| `submit_reasoning_enabled` | Submit response | Reasoning/thinking toggle at send (`true` / `false` / omitted if unknown) |
| `prepared_using` | `get_answer` with `status: completed` only | Parsed from Perplexity’s “Prepared using …” attribution |

Agents cannot set model or reasoning via MCP yet — read-only telemetry.

## HTTP API (broker `:3317`)

Same behavior as MCP; camelCase in JSON bodies:

| Endpoint | Model-related response fields |
|----------|-------------------------------|
| `POST /chat/send` | `submitContext.submitModel`, `submitContext.submitReasoningEnabled` |
| `POST /thread/status` | `answer.preparedUsing` when `status` is `completed` |

Example `POST /chat/send` success:

```json
{
  "ok": true,
  "chatId": "https://www.perplexity.ai/search/…",
  "submitContext": { "submitModel": "GPT-5.4", "submitReasoningEnabled": null }
}
```

Example `POST /thread/status` when completed:

```json
{
  "ok": true,
  "status": "completed",
  "answer": { "answerText": "…", "preparedUsing": "GPT-5.4", "sources": [] }
}
```

Other routes: `/health`, `/session/ensure`. See [runbook.md](./runbook.md) and [acceptance.md](./acceptance.md).
