# Runbook

## First-time login

1. `cp .env.example .env` and set `HEADLESS=0`
2. `pnpm doctor` (or `pnpm smoke:worker`)
3. Log in manually in the opened browser
4. Re-run `pnpm doctor` — expect `perplexity_session: OK`

## CI / pre-flight check

```bash
pnpm build
pnpm doctor --broker
```

`pnpm doctor` exits `0` when all checks pass, `1` when any fail — suitable for scripts and CI gates.

## Restart broker

Start the broker from the **repository root**, or set **absolute** `PROFILE_DIR` / `ARTIFACTS_DIR` in `.env` (so profile cookies are found regardless of cwd).

```bash
pnpm dev:broker
```

Profile is preserved under `./data/profile`. Cookies are not wiped on restart.

## Start broker at macOS login

Install a user LaunchAgent (broker only; MCP stays Cursor-managed):

```bash
pnpm build
pnpm launchd:install
```

See [launchd-macos.md](./launchd-macos.md) for architecture (broker vs MCP), installed paths (`~/Library/LaunchAgents/…`), verify, logs, and uninstall.

## Browser closes right after ask (Camoufox)

**Symptom:** Perplexity window opens, the prompt is sent, then the browser disappears; MCP may return `BROKER_OFFLINE` or fail mid-request.

**Cause (confirmed):** Playwright **1.60.0** crashes the Node broker when Firefox reports a page error without `location` (common on Perplexity). See [camoufox#617](https://github.com/daijro/camoufox/issues/617). LaunchAgent **KeepAlive** then restarts the broker (`runs` increments in `launchctl print`).

**Check logs:**

```bash
tail -30 data/logs/broker.stderr.log
```

Look for `pageError.location.url` / `TypeError: Cannot read properties of undefined`.

**Fix:** This repo pins `playwright-core` / `playwright` to **1.59.0**. After pulling: `pnpm install && pnpm build`, then restart the broker (`launchctl kickstart -k gui/$(id -u)/io.perplexity.desktop-broker` or `pnpm dev:broker`).

**Avoid:** Running `pnpm dev:broker` while the LaunchAgent is also bound to port 3317 — use one broker instance only.

## UI_CHANGED

1. Check `data/artifacts/` for screenshot and HTML snapshot
2. Update selectors in `packages/ui-selectors/`
3. Refresh fixtures in `packages/ui-state/__fixtures__/`
4. Re-run `pnpm test`
