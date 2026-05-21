# Manual acceptance (10 runs)

Prerequisites: logged-in profile, broker running on `127.0.0.1:3317`.

For each run `1..10`:

- [ ] `POST /session/ensure` → `logged_in: true`
- [ ] `POST /chat/send` with `new_thread: true`, short prompt → `ok: true`, non-empty `answer`
- [ ] Response includes `timings`
- [ ] No manual profile repair between runs

Optional MCP run: `perplexity_submit` then `perplexity_status` until `status: finished`, or blocking `perplexity_ask` with `ok: true`.

Concurrent test (once): second `send` while first generating → rejected or queued per `CONCURRENT_REQUEST_POLICY`.
