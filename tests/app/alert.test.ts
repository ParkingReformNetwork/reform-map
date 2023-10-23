import { expect, test } from "@playwright/test";
import { loadMap } from "./utils";

test("alerts appear and close", async ({ page }) => {
  await loadMap(page);

  const isAlertVisible = async (): Promise<boolean> =>
    page.locator("#no-requirements-alert").isVisible();

  // Before toggle is clicked
  expect(await isAlertVisible()).toBe(false);

  // Click toggle
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(true);

  // Click toggle again (closes alert)
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(false);

  // Click toggle
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(true);

  // Click alert close button
  await page.locator(".alert-close-button").click();
  expect(await isAlertVisible()).toBe(false);
});
