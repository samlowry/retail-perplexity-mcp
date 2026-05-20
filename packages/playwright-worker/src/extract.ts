import type { Page } from "playwright-core";
import type { AnswerPayload, ResponseFormatType, Source } from "@pdb/types";
import { getLastAnswerBlock } from "@pdb/ui-selectors";
import { BrokerErrorCode } from "@pdb/types";

export async function getLastAnswer(
  page: Page,
  format: ResponseFormatType,
): Promise<AnswerPayload> {
  const block = await getLastAnswerBlock(page);
  if (!block) {
    throw {
      ok: false,
      code: BrokerErrorCode.EXTRACTION_FAILED,
      message: "Answer block not found",
    };
  }

  const text = (await block.locator.innerText()).trim();
  const html = await block.locator.innerHTML().catch(() => "");

  const payload: AnswerPayload = {
    text,
    sources: await extractSources(page),
    rawHtml: html,
  };

  if (format === "markdown" || format === "json_best_effort") {
    payload.markdown = text;
  }
  if (format === "html_fragment") {
    payload.htmlFragment = html;
  }

  return payload;
}

export async function extractSources(page: Page): Promise<Source[]> {
  const links = page.locator('a[href^="http"]');
  const count = await links.count();
  const sources: Source[] = [];

  for (let i = 0; i < Math.min(count, 20); i++) {
    const link = links.nth(i);
    const url = await link.getAttribute("href");
    const title = (await link.innerText().catch(() => "")) || url || "";
    if (url && !url.includes("perplexity.ai")) {
      sources.push({ title: title.slice(0, 200), url });
    }
  }

  return sources;
}
