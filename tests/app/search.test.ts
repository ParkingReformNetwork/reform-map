import { expect, test } from "@playwright/test";

import { getNumCities, loadMap } from "./utils";

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);

  await page.locator(".choices").click();
  await page
    .locator(".choices__list--dropdown > .choices__list > .choices__item")
    .first()
    .click();
  let cities = await getNumCities(page);
  expect(cities).toBe(1);

  // Removing the selected cities restores all.
  await page
    .locator(".choices__inner > .choices__list > .choices__item > button")
    .click();
  cities = await getNumCities(page);
  expect(cities).toBeGreaterThan(1400);
});
