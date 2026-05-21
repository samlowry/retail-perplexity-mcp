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

3. Restart Cursor and verify the single MCP tool: `perplexity_ask`.

## Agent tool: `perplexity_ask`

The MCP server exposes one tool for agents. Session bootstrap (`/session/ensure`), health checks, and chat send are handled internally; `session_id` is always `default` and is not exposed.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `question` | string | (required) | Prompt text |
| `new_chat` | boolean | `false` | Start a new Perplexity thread before sending |
| `timeout_seconds` | number | `600` (10 min) | Max wait for the answer |
| `format` | `markdown` \| `text` | `markdown` | Answer format |

Response is JSON in the tool text content:

- Success: `{ "ok": true, "answer": "...", "sources": [...], "timings_ms": { ... } }`
- Failure: `{ "ok": false, "code": "...", "message": "..." }`

Agent-facing error codes: `NEEDS_LOGIN`, `BROKER_OFFLINE`, `BUSY`, `TIMEOUT`, `FAILED`.

HTTP routes (`/health`, `/session/ensure`, `/chat/send`, etc.) remain on the broker for doctor and development; only the MCP surface is simplified.
