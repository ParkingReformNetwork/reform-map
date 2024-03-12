import { expect, test } from "@playwright/test";
import { loadMap } from "./utils";

test("alerts appear and close", async ({ page }) => {
  await loadMap(page);

  const isAlertVisible = async (): Promise<boolean> =>
    page.locator("#no-requirements-alert").isVisible();

  // Default toggle is ON, and alert should be visible.
  // Before toggle is clicked
  expect(await isAlertVisible()).toBe(true);

  // Click toggle OFF
  await page.locator(".filters-popup-icon").click();
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(false);

  // Click toggle ON
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(true);

  // Click toggle OFF
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(false);

  // Click toggle ON
  await page.locator("#no-requirements-toggle").click({ force: true });
  expect(await isAlertVisible()).toBe(true);

  // Click alert close button
  await page.locator(".alert-close-button").click();
  expect(await isAlertVisible()).toBe(false);
});
