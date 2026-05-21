# Troubleshooting

| Code | Action |
|------|--------|
| `AUTH_REQUIRED` | Run `pnpm doctor`, log in manually in the PROFILE_DIR browser. If `/session/ensure` is OK but `/thread/status` fails, restart broker after `pnpm build` — thread pages use different DOM heuristics than home. |
| `SESSION_BROKEN` | Restart broker; run `ensure_session` |
| `UI_CHANGED` | Update selectors/fixtures; see runbook |
| `GENERATION_TIMEOUT` | Increase `DEFAULT_TIMEOUT_MS`; check network |
| `RATE_LIMITED` | Wait and retry |
| `CONFLICT` | Another job holds session; use queue or wait |

Artifacts: `./data/artifacts/`
