# Thread navigation policy (maintainer)

How the Playwright worker opens Perplexity chat URLs before submit vs status poll. Implemented in [`openThreadUrl`](../../packages/playwright-worker/src/generation.ts) via `ThreadOpenPolicy`.

## Three broker cases (two MCP tools)

| Case | MCP / HTTP | Browser steps | Same tab already on this `chat_id` | Tab on another URL |
|------|------------|---------------|-------------------------------------|---------------------|
| **1. New topic** | `perplexity_submit_question` without `chat_id` / `POST /chat/send` without `chatId` | `ensureSession` → `goto` home → `newThread` | N/A | `goto` home |
| **2. Follow-up submit** | Submit **with** `chat_id` / `chatId` | `ensureBrowserReady` → `openThreadUrl(..., followUpSubmit)` | **No reload** — type into live DOM | **`goto` thread** (full document load) |
| **3. Status poll** | `perplexity_get_answer` / `POST /thread/status` | `openThreadUrl(..., statusPoll)` → read UI | **`reload` always** — unfreeze stale SPA | **`goto` thread** (full load; no extra reload) |

## Why `goto` is enough on a different URL

`page.goto(threadUrl)` when the tab is on home or another chat loads the thread document from the server. That is a full navigation, not an in-place SPA patch. No second `reload` after `goto`.

## Why status poll reloads on the same URL

After long generations (~40s+), Perplexity’s SPA can show a **frozen or misleading DOM** (still “typing”, old completed answer, parse errors). `page.reload()` on the **same** URL resets UI state before `detectUiState` / extraction.

`goto` to the same URL is skipped (Playwright no-op path); **`reload` is required** for case 3.

## Why follow-up submit does not reload on the same URL

Typical flow: poll returns `completed` (case 3 just reloaded) → user/agent sends a quick follow-up in the **same** thread. Another reload would add latency and can disrupt a stream that just started.

If the tab points at an old or different chat, case 2 uses **`goto`** only.

## Non-goals

- Do not reload before follow-up submit when already on the thread URL.
- Do not skip reload on status poll when already on the thread URL (removed 2026-05: `reloadIfActive: false` default for polls).
- New topics do not use `ThreadOpenPolicy`; they use home navigation + new thread.

## Code map

| Policy | Call sites |
|--------|------------|
| `ThreadOpenPolicy.StatusPoll` | `PlaywrightWorker.getThreadStatus`, `pollJobGeneration` |
| `ThreadOpenPolicy.FollowUpSubmit` | `PlaywrightWorker.submitPrompt` when `threadUrl` is set |
