# Platform notes

Same broker flow on all platforms: clone repo, `pnpm install`, `pnpm camoufox:fetch`, one-time headed login, then headless broker + MCP.

| Platform | Keep broker running | Profile path | Notes |
|----------|---------------------|--------------|--------|
| **macOS** | `pnpm launchd:install` after `pnpm build` | `./data/profile` (use absolute paths in `.env` for LaunchAgent) | See [launchd-macos.md](./launchd-macos.md) |
| **Linux** | Manual `pnpm dev:broker`, or a **systemd user unit** (example below) | `./data/profile` | Headed login needs X11/Wayland; then `HEADLESS=1` is fine |
| **Windows** | Manual `pnpm dev:broker`, or **Task Scheduler** running `node apps\broker\dist\index.js` | `.\data\profile` | Use absolute paths in `.env`; Camoufox fetch same as macOS/Linux |

## Linux systemd user unit (example)

Save as `~/.config/systemd/user/perplexity-broker.service` (adjust `WorkingDirectory` and `ExecStart`):

```ini
[Unit]
Description=Perplexity desktop broker
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/retail-perplexity-mcp
ExecStart=/usr/bin/node apps/broker/dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now perplexity-broker.service
```

## Windows Task Scheduler (outline)

1. `pnpm build` in the repo root.
2. Action: start program `node.exe` with arguments `apps\broker\dist\index.js`.
3. Start in: repository root; set `BROKER_HOST`, `PROFILE_DIR`, etc. in `.env` or task environment.

## Browser setup (all platforms)

```bash
pnpm camoufox:fetch
```

Pin Playwright/Camoufox versions per root `package.json` / lockfile after upgrades.
