# Architecture

Four layers:

1. **Cursor** — MCP stdio client
2. **apps/mcp-server** — thin tool wrappers → HTTP
3. **apps/broker** + **packages/core** — jobs, locks, orchestration
4. **packages/playwright-worker** — headed persistent Camoufox (Firefox anti-detect) → Perplexity UI

Supporting packages: `ui-selectors`, `ui-state`, `types`.

See project skill `.cursor/skills/perplexity-desktop-broker/SKILL.md` for invariants.
