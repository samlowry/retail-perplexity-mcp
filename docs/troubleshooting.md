# Troubleshooting

| Code | Action |
|------|--------|
| `AUTH_REQUIRED` | Run doctor, log in manually in profile browser |
| `SESSION_BROKEN` | Restart broker; run `ensure_session` |
| `UI_CHANGED` | Update selectors/fixtures; see runbook |
| `GENERATION_TIMEOUT` | Increase `DEFAULT_TIMEOUT_MS`; check network |
| `RATE_LIMITED` | Wait and retry |
| `CONFLICT` | Another job holds session; use queue or wait |

Artifacts: `./data/artifacts/`
