# Cursor MCP setup

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

3. Restart Cursor and verify tools: `perplexity_health`, `perplexity_send_prompt`, etc.
