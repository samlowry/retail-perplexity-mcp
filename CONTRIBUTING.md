# Contributing

Thanks for your interest in contributing.

## Before You Start

- Open an issue first for substantial changes to align on scope.
- Keep pull requests focused and small when possible.
- Use English for code, comments, documentation, and commit messages.

## Development Setup

1. `cp .env.example .env`
2. `pnpm install`
3. `pnpm build`
4. `pnpm test`
5. `pnpm typecheck`

If tests that use Playwright fail due to missing browser binaries, run:

`pnpm exec playwright install`

## Pull Request Checklist

- Add or update tests for behavior changes.
- Update documentation for user-facing or operational changes.
- Ensure `pnpm build`, `pnpm test`, and `pnpm typecheck` pass locally.
- Do not commit secrets, browser profiles, logs, HAR, or screenshots.

## Commit Style

This repository uses emoji-prefixed imperative commit messages, for example:

- `✨ Add foo`
- `🐛 Fix bar`
- `📚 Update docs`

Keep the summary line concise and avoid a trailing period.
