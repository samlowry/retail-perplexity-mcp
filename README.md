# Perplexity Desktop Broker

Local Node.js + Playwright broker that exposes an HTTP JSON API and thin MCP tools for Cursor to control a logged-in Perplexity web UI via a persistent browser profile.

## Prerequisites

- Node.js 20+
- pnpm 10+ (`npx pnpm@10.11.0 install` if needed)
- Playwright browsers: `npx playwright install chromium`

## Quick start

```bash
cp .env.example .env
npx pnpm@10.11.0 install
npx pnpm@10.11.0 build
npx pnpm@10.11.0 dev:broker
```

Health check:

```bash
curl http://127.0.0.1:3317/health
```

## One-time login

1. Set `HEADLESS=0` in `.env`
2. Run `pnpm doctor` (after PR-5) or `pnpm smoke:worker` (after PR-3)
3. Log in manually in the opened Chromium window
4. Session is stored under `./data/profile`

## Linux desktop

Same flow as macOS. Use headed Chromium (`HEADLESS=0`) and install deps: `npx playwright install chromium`. X11/Wayland display required for manual login.

## Workspace layout

See [docs/BACKLOG.md](docs/BACKLOG.md) and [.cursor/skills/perplexity-desktop-broker/SKILL.md](.cursor/skills/perplexity-desktop-broker/SKILL.md).

## MCP in Cursor

See [docs/mcp-cursor-setup.md](docs/mcp-cursor-setup.md). Example config: [.cursor/mcp.json](.cursor/mcp.json).

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:broker` | Start HTTP broker |
| `pnpm dev:mcp` | Start MCP server (stdio) |
| `pnpm doctor` | Environment and session checks |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Live UI tests (`@live`) |
| `pnpm smoke:worker` | Manual Playwright smoke |
