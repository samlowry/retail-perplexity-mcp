```
  ┌──────────┐        ┌─────────────────────┐        ┌─────────────┐
  │  agent   │──MCP──►│  desktop · broker   │──────► │  perplexity │
  └──────────┘        └─────────────────────┘        └─────────────┘
```

# perplexity-desktop-broker

> Drive a logged-in Perplexity web session from your AI agent —  
> give your agents full Perplexity power.

[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)
[![pnpm 10+](https://img.shields.io/badge/pnpm-10%2B-orange)](https://pnpm.io)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A local Node.js + Playwright broker that exposes an HTTP JSON API and MCP tools so Cursor agents can submit questions to Perplexity and poll for answers — through your **own browser session**, bypassing rate limits and paywalls on the official API tier.

## Architecture

```
Cursor / AI agent
       │
       │ MCP (stdio)
       ▼
  MCP Server  ──────►  HTTP Broker  :3317
                              │
                              │ Playwright (Camoufox)
                              ▼
                    Perplexity web UI
                    (persistent profile)
```

The broker owns the browser; the MCP server is a thin wrapper that translates tool calls into HTTP requests.

## Prerequisites

- **Node.js 20+**
- **pnpm 10+** — `npx pnpm@10.11.0 install` if not installed globally
- **Camoufox** — anti-detect Firefox fork that survives Cloudflare checks:
  ```bash
  pnpm camoufox:fetch
  ```

## Quick start

```bash
cp .env.example .env
npx pnpm@10.11.0 install
npx pnpm@10.11.0 build
npx pnpm@10.11.0 dev:broker
```

Run all commands from the repo root, or set absolute paths for `PROFILE_DIR` / `ARTIFACTS_DIR` in `.env`.

Verify the broker is up:
```bash
curl http://127.0.0.1:3317/health
```

## One-time login

The broker stores your session in `./data/profile` so you only log in once.

1. Set `HEADLESS=0` in `.env`
2. Run `pnpm doctor` (after PR-5) or `pnpm smoke:worker` (after PR-3)
3. Complete login in the opened Camoufox window
4. Close the window — the session persists on subsequent headless runs

> **Migrating from Chromium?** Delete `./data/profile` before logging in. Chromium and Firefox profiles are incompatible.

## MCP usage in Cursor

See [docs/mcp-cursor-setup.md](docs/mcp-cursor-setup.md) for the full config. Example: [.cursor/mcp.json](.cursor/mcp.json).

The two-step tool contract:

| Step | Tool | Parameters | When done |
|------|------|------------|-----------|
| 1 | `perplexity_submit_question` | `question`, optional `chat_id` | Returns `chat_id` |
| 2 | `perplexity_get_answer` | `chat_id` | Poll until `completed` or `error` |

## Agent skill: how to use it correctly

The project ships with a dedicated Cursor skill:
`/.cursor/skills/perplexity-desktop-broker/SKILL.md`.

This skill is not a generic hint file. It is an operational contract for any
agent that works with factual or implementation-critical tasks.

### What this skill enforces

- **Research-before-reasoning:** submit research first, then reason and edit.
- **Two-call workflow only:** `perplexity_submit_question` then
  `perplexity_get_answer`.
- **Mandatory polling:** `running` means "not ready yet", not "good enough".
- **No factual edits from memory:** tables, dates, metrics, and records must come
  from the completed `result` (or official links in `sources`).
- **Resume-safe behavior:** if interrupted, continue with `get_answer` using the
  same `chat_id`, not a duplicate submit.

### Recommended workflow for agents

1. Build one complete research brief (goal, repo context, constraints, output
   shape).
2. Call `perplexity_submit_question` and store the returned `chat_id`.
3. Poll with `perplexity_get_answer` until `completed` or `error`.
4. Only after `completed`: implement, edit docs, or publish factual text.

This pattern is the most reliable way to avoid stale facts and "hallucinated"
numbers during long multi-file updates.

### Common anti-patterns to avoid

- Submitting once and writing factual content while status is still `running`.
- Re-submitting the same brief instead of polling the existing `chat_id`.
- Using stale fact packs as a replacement for a fresh submit+poll cycle.
- Mixing multiple in-flight submissions for one factual wave.

### Why this matters in production

For this broker, most expensive failures are not code style issues; they are
factual integrity issues (wrong records, wrong stats, outdated policy details).
The skill is designed to make those failures structurally unlikely by forcing
verified data flow before edits.

## MCP client compatibility (top clients)

This broker is transport-agnostic on the MCP layer and works with any MCP host
that supports local stdio servers or remote MCP endpoints, depending on your
deployment setup.

Verified compatibility (official docs and/or first-party references, May 2026):

| Client | MCP support | Notes |
|--------|-------------|-------|
| Cursor (IDE + CLI + Cloud Agents) | Native | Project/global `mcp.json`, OAuth-capable, supports tools/resources/prompts/apps. |
| Claude Code | Native | Full MCP management via CLI and `/mcp`, supports local and remote servers. |
| Claude Desktop | Native | Supports local MCP servers and desktop extensions (`.mcpb`). |
| OpenAI Codex (CLI/App) | Native | Supports MCP server config and MCP management commands. |
| OpenClaw | Native | Supports MCP as client and can also expose itself via `openclaw mcp serve`. |
| Cline (VS Code + CLI) | Native | MCP marketplace + manual config, local and remote transports. |
| Windsurf (Cascade) | Native | Built-in MCP support and marketplace; configurable via `mcp_config.json`. |
| Continue (VS Code/JetBrains extension) | Native (Agent mode) | MCP works in Agent mode; supports JSON-format interop from Cursor/Cline-style configs. |
| VS Code with GitHub Copilot agent tools | Native | First-party docs include MCP server add/manage flow and MCP app support. |
| Goose | Native | Extension system is MCP-based; supports local and remote MCP transports. |

If your MCP client can launch stdio servers and forward tool calls correctly,
it can typically use this broker with minimal or zero adaptation.

## macOS: auto-start at login

Install a LaunchAgent so the broker starts when you log in (MCP is still launched by Cursor on demand):

```bash
pnpm build && pnpm launchd:install
```

Full paths, architecture, logs, and uninstall instructions: [docs/launchd-macos.md](docs/launchd-macos.md).

## Linux

Same flow as macOS. Use headed Camoufox (`HEADLESS=0`) for the initial login. X11 or Wayland display is required during that step; subsequent headless runs work without a display.

## Scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev:broker` | Start the HTTP broker |
| `pnpm dev:mcp` | Start the MCP server (stdio) |
| `pnpm doctor` | Check environment and session health |
| `pnpm launchd:install` | macOS: install broker as a LaunchAgent |
| `pnpm launchd:uninstall` | macOS: remove the LaunchAgent |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Live UI tests (requires active session, tagged `@live`) |
| `pnpm smoke:worker` | Manual Playwright smoke test |

## Security and artifacts

- Never commit `.env`, browser profile data, logs, HAR files, screenshots, or Playwright traces.
- Report vulnerabilities via GitHub private vulnerability reporting — see [SECURITY.md](SECURITY.md).

## Project docs

- [docs/BACKLOG.md](docs/BACKLOG.md) — roadmap and open issues
- [.cursor/skills/perplexity-desktop-broker/SKILL.md](.cursor/skills/perplexity-desktop-broker/SKILL.md) — agent skill spec
- [CHANGELOG.md](CHANGELOG.md) — version history
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution guide
- [LICENSE](LICENSE) — MIT
