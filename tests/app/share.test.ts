import { expect, test } from "@playwright/test";
import { SHARE_URL } from "../../src/js/share";

test("share button writes the URL to the clipboard", async ({ browser }) => {
  const context = await browser.newContext();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  await page.goto("");

  await page.click(".share-icon");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toEqual(SHARE_URL);
});
