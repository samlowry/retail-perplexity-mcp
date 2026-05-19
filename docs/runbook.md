# Runbook

## First-time login

1. `cp .env.example .env` and set `HEADLESS=0`
2. `pnpm doctor` (or `pnpm smoke:worker`)
3. Log in manually in the opened browser
4. Re-run `pnpm doctor` — expect `perplexity_session: OK`

## Restart broker

```bash
pnpm dev:broker
```

Profile is preserved under `./data/profile`. Cookies are not wiped on restart.

## UI_CHANGED

1. Check `data/artifacts/` for screenshot and HTML snapshot
2. Update selectors in `packages/ui-selectors/`
3. Refresh fixtures in `packages/ui-state/__fixtures__/`
4. Re-run `pnpm test`
