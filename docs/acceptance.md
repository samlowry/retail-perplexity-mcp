# Manual acceptance (10 runs)

Prerequisites: logged-in profile, broker running on `127.0.0.1:3317`.

For each run `1..10`:

- [ ] `POST /session/ensure` → `logged_in: true`
- [ ] `POST /chat/send` without `chatId`, short prompt → `ok: true`, `chatId`
- [ ] `POST /thread/status` with that URL as `chatId` until `status: completed`, non-empty `answer`
- [ ] `POST /chat/send` with `chatId` (slug) → follow-up in same thread
- [ ] Response includes `timings`
- [ ] No manual profile repair between runs

Optional MCP run: `perplexity_submit_question` then `perplexity_get_answer` until `status: completed` with `result`.

Concurrent test (once): second overlapping request while first is running → immediate `CONFLICT`/`BUSY` (no queue); continue polling the original `chatId`.
