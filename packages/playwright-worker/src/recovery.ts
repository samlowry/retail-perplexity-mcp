import type { BrowserSessionManager } from "./session.js";

/**
 * Close a dead browser context so the caller can relaunch (keeps profile dir on disk).
 * Does not call ensureBrowserReady — that would recurse back into this helper.
 */
export async function relaunchContextIfDead(session: BrowserSessionManager): Promise<void> {
  const page = session.getPage();
  const context = session.getContext();

  if (context && page && !page.isClosed()) {
    return;
  }

  await session.close();
}
