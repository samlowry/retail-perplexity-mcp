# Troubleshooting

| Code | Action |
|------|--------|
| `AUTH_REQUIRED` | Run `pnpm doctor`, log in manually in the PROFILE_DIR browser. If `/session/ensure` is OK but `/thread/status` fails, restart broker after `pnpm build` — thread pages use different DOM heuristics than home. |
| `SESSION_BROKEN` | Restart broker; run `ensure_session` |
| `UI_CHANGED` | Update selectors/fixtures; see runbook |
| `PROMPT_SEND_FAILED` + log mentions `Set up Computer` intercepts | Not a blocker for humans — fixed promo card in bottom-right. Broker submits via **Enter**, then `force` click if needed; it does not try to close the card. Rebuild worker and restart broker. |
| `GENERATION_TIMEOUT` | Increase `DEFAULT_TIMEOUT_MS`; check network |
| `RATE_LIMITED` | Wait and retry. If it appears mid-generation on long answers, rebuild broker — older detectors matched "rate limiting" inside answer text. |
| `CONFLICT` | Another job holds session; use queue or wait |

Artifacts: `./data/artifacts/`
