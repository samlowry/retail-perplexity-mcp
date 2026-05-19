import type { Page } from "playwright";
import { getFileInput } from "@pdb/ui-selectors";
import { BrokerErrorCode } from "@pdb/types";

export async function uploadFile(page: Page, filePath: string): Promise<void> {
  const input = await getFileInput(page);
  if (!input) {
    throw {
      ok: false,
      code: BrokerErrorCode.ATTACHMENT_FAILED,
      message: "File input not found",
    };
  }
  await input.locator.setInputFiles(filePath);
}
