# macOS: Perplexity broker at login (LaunchAgent)

This document describes the **system-level (user login) autostart** for the Perplexity Desktop Broker HTTP API. It does **not** start the MCP server — only the broker.

## Architecture: what runs where

| Component | Binary / entry | Who starts it | Needed at login? |
|-----------|----------------|---------------|------------------|
| **Broker** | `node apps/broker/dist/index.js` | LaunchAgent (this doc) or manual `pnpm dev:broker` | **Yes** — listens on `127.0.0.1:3317` |
| **MCP server** | `node apps/mcp-server/dist/index.js` | **Cursor** via `~/.cursor/mcp.json` when a tool is called | **No** — stdio child of Cursor, not a daemon |
| **Camoufox / browser** | Playwright worker inside broker | Broker on first `ensure` / chat | Lazy — profile on disk in `PROFILE_DIR` |

Flow: **Cursor → MCP (`perplexity_ask`) → HTTP broker → Playwright/Camoufox → Perplexity web UI**.

The broker must already be up before MCP calls succeed. LaunchAgent keeps the broker running across reboots and logins.

## Files in the repository

| Path | Role |
|------|------|
| `scripts/launchd/com.samlowry.perplexity-broker.plist.template` | Template; placeholders replaced at install time |
| `scripts/install-launch-agent.sh` | Generates plist, installs to `~/Library/LaunchAgents/`, loads service |
| `scripts/uninstall-launch-agent.sh` | Unloads and removes the plist |
| `package.json` → `pnpm launchd:install` / `launchd:uninstall` | Shortcuts to the scripts above |
| `docs/launchd-macos.md` | This document |
| `docs/runbook.md` | Operational runbook (links here) |
| `docs/mcp-cursor-setup.md` | Global MCP config in Cursor (unchanged by launchd) |

## Files installed on macOS (outside the repo)

When you run `pnpm launchd:install`, the script writes:

| Path | Description |
|------|-------------|
| `~/Library/LaunchAgents/com.samlowry.perplexity-broker.plist` | **LaunchAgent plist** — registered with `launchctl` for your user (`gui/<uid>`) |
| `<repo>/data/logs/broker.stdout.log` | Broker stdout (gitignored) |
| `<repo>/data/logs/broker.stderr.log` | Broker stderr (gitignored) |

**Label (service name):** `com.samlowry.perplexity-broker`

**Domain:** `gui/$(id -u)` — user session, starts at **login**, not system-wide root.

**Not installed by launchd:**

- `~/.cursor/mcp.json` — you configure MCP separately (see `docs/mcp-cursor-setup.md`).
- `~/.cursor/skills/perplexity-desktop-broker/` — global skill copy (optional; project skill is under `.cursor/skills/`).

### Generated plist settings

- **WorkingDirectory:** repository root (so `.env` in the repo root is loaded).
- **ProgramArguments:** `$(which node)` + `apps/broker/dist/index.js` (absolute paths after install).
- **RunAtLoad:** `true` — start at login.
- **KeepAlive:** `true` — restart if the process exits.
- **ThrottleInterval:** 10s — limits crash loops.

Example install target (paths vary per machine):

```
~/Library/LaunchAgents/com.samlowry.perplexity-broker.plist
```

## Prerequisites

1. **Build:** `pnpm build` from repo root (`apps/broker/dist/index.js` must exist).
2. **`.env`** in repo root with **absolute** `PROFILE_DIR` and `ARTIFACTS_DIR` (see `.env.example`). LaunchAgent does not embed secrets; it only sets `PATH` and `HOME`.
3. **Node 20+** on `PATH` when you run the install script (`which node`). The plist pins whatever `node` was active at install time — re-run install after switching nvm versions.

## Install

From the repository root:

```bash
chmod +x scripts/install-launch-agent.sh scripts/uninstall-launch-agent.sh
pnpm build
pnpm launchd:install
```

Or:

```bash
./scripts/install-launch-agent.sh
```

The script:

1. Checks `.env` and `apps/broker/dist/index.js`.
2. Creates `data/logs/`.
3. Substitutes `__REPO_ROOT__`, `__NODE_BIN__`, etc. in the template.
4. Copies the plist to `~/Library/LaunchAgents/`.
5. Loads via `launchctl bootstrap` (fallback: `launchctl load -w`).
6. Starts the job immediately (`kickstart`).

## Verify

```bash
curl -s http://127.0.0.1:3317/health
launchctl print gui/$(id -u)/com.samlowry.perplexity-broker
tail -f data/logs/broker.stderr.log
```

Expected health: broker `up` (browser may be `down` until first ensure/chat).

## Logs

| File | Content |
|------|---------|
| `data/logs/broker.stdout.log` | Fastify / broker stdout |
| `data/logs/broker.stderr.log` | Errors, stack traces |

Both are gitignored under `data/logs/`.

## Uninstall

```bash
pnpm launchd:uninstall
```

Removes `~/Library/LaunchAgents/com.samlowry.perplexity-broker.plist` and unloads the job. Logs under `data/logs/` are left on disk.

## After code or `.env` changes

1. `pnpm build` if broker or worker code changed.
2. `pnpm launchd:install` — regenerates plist (node path, repo root).
3. Or restart only: `launchctl kickstart -k gui/$(id -u)/com.samlowry.perplexity-broker`

## Manual control

```bash
# Restart broker process
launchctl kickstart -k gui/$(id -u)/com.samlowry.perplexity-broker

# Stop until next login (unload)
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.samlowry.perplexity-broker.plist
```

For day-to-day dev you can still run `pnpm dev:broker` manually; avoid two brokers on the same port — stop the agent first or use a different `BROKER_PORT` in `.env`.

## Operational notes

### Perplexity session (login)

- Cookies live in `PROFILE_DIR` (absolute path in `.env`).
- After OS update or cookie expiry you may need `HEADLESS=0` and `pnpm doctor` once; Camoufox window may appear on first browser use.
- Chromium and Camoufox profiles are not interchangeable — re-login if you changed `BROWSER_ENGINE`.

### Camoufox and GUI

- `HEADLESS=0` in `.env` may show a browser window when the worker starts.
- LaunchAgent inherits a minimal environment; `DISPLAY` may be set if XQuartz was used — headed mode on macOS normally uses the native display when you are logged in.

### MCP in Cursor

- Config: `~/.cursor/mcp.json` entry `perplexity-broker` → `node` + absolute path to `apps/mcp-server/dist/index.js`, env `BROKER_HOST` / `BROKER_PORT`.
- Cursor spawns MCP on demand; **no** LaunchAgent entry for MCP.
- Reload Cursor window after changing `mcp.json` or MCP build.

### What not to autostart

| Service | Reason |
|---------|--------|
| MCP server | Stdio child of Cursor; no stable daemon lifecycle |
| `pnpm dev:broker` (tsx watch) | Dev-only; production agent uses `dist/index.js` |
| Duplicate broker | Port `3317` conflict — one LaunchAgent or one manual instance |

### Node version

Install script records `$(which node)` in the plist. If you upgrade Node via nvm, run `pnpm launchd:install` again. Node 22 arm64 is recommended for this repo; Node 23 has had native module issues with some dependencies.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `curl` connection refused | `launchctl print gui/$(id -u)/com.samlowry.perplexity-broker`, `broker.stderr.log` |
| Wrong Perplexity account | Duplicate `data/profile` under `apps/broker/` — use absolute `PROFILE_DIR`, broker cwd = repo root |
| MCP works but slow first call | Browser cold start; run `pnpm doctor` once after login |
| Service not after reboot | `launchctl print` — plist must be in `~/Library/LaunchAgents/` and not disabled |

## Related docs

- [runbook.md](./runbook.md) — login, restart, UI_CHANGED
- [mcp-cursor-setup.md](./mcp-cursor-setup.md) — Cursor MCP JSON
- [README.md](../README.md) — quick start and script table
