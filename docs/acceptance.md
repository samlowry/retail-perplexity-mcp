# Manual acceptance (10 runs)

Prerequisites: logged-in profile, broker running on `127.0.0.1:3317`.

For each run `1..10`:

- [ ] `POST /session/ensure` → `logged_in: true`
- [ ] `POST /chat/send` without `chatId`, short prompt → `ok: true`, `threadUrl`
- [ ] `POST /thread/status` with that URL as `chatId` until `status: completed`, non-empty `answer`
- [ ] `POST /chat/send` with `chatId` (slug) → follow-up in same thread
- [ ] Response includes `timings`
- [ ] No manual profile repair between runs

Optional MCP run: `perplexity_submit` then `perplexity_status` until `status: completed` with `result`.

Concurrent test (once): second `send` while first generating → rejected or queued per `CONCURRENT_REQUEST_POLICY`.
