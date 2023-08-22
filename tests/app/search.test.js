import { expect, test } from "@playwright/test";

import { getNumCities, loadMap } from "./utils";

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);

  await page.locator(".selectize-input").click();
  await page.locator(".selectize-dropdown-content > .option").first().click();
  let cities = await getNumCities(page);
  expect(cities).toBe(1);

  // Removing the selected cities restores all.
  // TODO(#198): figure this out!
  // await page.locator("#map").click();
  // await page.locator(".selectize-input").press("Backspace");
  // cities = await getNumCities(page);
  // expect(cities).toBeGreaterThan(1700);
});
