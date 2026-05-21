# Perplexity Desktop Broker

Local Node.js + Playwright broker that exposes an HTTP JSON API and thin MCP tools for Cursor to control a logged-in Perplexity web UI via a persistent browser profile.

## Prerequisites

- Node.js 20+
- pnpm 10+ (`npx pnpm@10.11.0 install` if needed)
- Camoufox browser: `pnpm camoufox:fetch` (anti-detect Firefox for Cloudflare login)

## Quick start

```bash
cp .env.example .env
npx pnpm@10.11.0 install
npx pnpm@10.11.0 build
npx pnpm@10.11.0 dev:broker
```

Run broker commands from the repo root, or use absolute `PROFILE_DIR` / `ARTIFACTS_DIR` in `.env`.

Health check:

```bash
curl http://127.0.0.1:3317/health
```

## One-time login

1. Set `HEADLESS=0` in `.env`
2. Run `pnpm doctor` (after PR-5) or `pnpm smoke:worker` (after PR-3)
3. Log in manually in the opened Camoufox (Firefox) window
4. Session is stored under `./data/profile`

> After migrating from Chromium, delete `./data/profile` and log in again (profiles are not compatible).

## Linux desktop

Same flow as macOS. Use headed Camoufox (`HEADLESS=0`), run `pnpm camoufox:fetch`. X11/Wayland display required for manual login.

## Workspace layout

See [docs/BACKLOG.md](docs/BACKLOG.md) and [.cursor/skills/perplexity-desktop-broker/SKILL.md](.cursor/skills/perplexity-desktop-broker/SKILL.md).

## macOS: broker at login

Install a user LaunchAgent so the HTTP broker starts when you log in (MCP is still started by Cursor):

```bash
pnpm build && pnpm launchd:install
```

Full paths, architecture, logs, and uninstall: **[docs/launchd-macos.md](docs/launchd-macos.md)**.

## MCP in Cursor

See [docs/mcp-cursor-setup.md](docs/mcp-cursor-setup.md). Example config: [.cursor/mcp.json](.cursor/mcp.json).

Agents use MCP tools **`perplexity_submit`** + **`perplexity_status`** for long or concurrent research, or blocking **`perplexity_ask`** for short asks. See [docs/mcp-cursor-setup.md](docs/mcp-cursor-setup.md).

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:broker` | Start HTTP broker |
| `pnpm launchd:install` | macOS: broker at user login (LaunchAgent) |
| `pnpm launchd:uninstall` | Remove LaunchAgent |
| `pnpm dev:mcp` | Start MCP server (stdio) |
| `pnpm doctor` | Environment and session checks |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Live UI tests (`@live`) |
| `pnpm smoke:worker` | Manual Playwright smoke |
