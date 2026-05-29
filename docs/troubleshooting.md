# Troubleshooting

| Code | Action |
|------|--------|
| `AUTH_REQUIRED` | Run `pnpm doctor`, log in manually in the PROFILE_DIR browser. If `/session/ensure` is OK but `/thread/status` fails, restart broker after `pnpm build` — thread pages use different DOM heuristics than home. |
| `SESSION_BROKEN` | Restart broker; run `ensure_session` |
| `UI_CHANGED` | Update selectors/fixtures; see runbook |
| `PROMPT_SEND_FAILED` + log mentions `Set up Computer` intercepts | Not a blocker for humans — fixed promo card in bottom-right. Broker submits via **Enter**, then `force` click if needed; it does not try to close the card. Rebuild worker and restart broker. |
| Stale or frozen UI on poll (`running` forever, wrong completed text) | Status poll **reloads** the thread tab when already on that URL (unfreezes SPA). Rebuild worker and restart broker. See [internal/thread-navigation.md](./internal/thread-navigation.md). |
| Follow-up in same thread right after `completed` | Follow-up **submit** does not reload when the tab is already on that `chat_id` (page was refreshed on last poll). If the tab is elsewhere, broker `goto`s the thread first. |
| `GENERATION_TIMEOUT` | Increase `DEFAULT_TIMEOUT_MS`; check network |
| `RATE_LIMITED` | Wait and retry. If it appears mid-generation on long answers, rebuild broker — older detectors matched "rate limiting" inside answer text. |
| `CONFLICT` | Another request is already in flight for this session; overlap is rejected immediately (BUSY, no queue). Keep polling the original `chat_id` or wait and retry. |

Artifacts: `./data/artifacts/`

On `PROMPT_SEND_FAILED` / `EXTRACTION_FAILED`, broker errors may include `debug.actionLog` (last worker steps) for diagnosis.
