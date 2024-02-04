import { test } from "@playwright/test";

import {
  assertNumCities,
  loadMap,
  deselectToggle,
  DEFAULT_CITY_RANGE,
} from "./utils";

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);

  await deselectToggle(page);

  await page.locator(".choices").click();
  await page
    .locator(".choices__list--dropdown > .choices__list > .choices__item")
    .first()
    .click();
  await assertNumCities(page, [1, 1]);

  // Removing the selected cities restores all.
  await page
    .locator(".choices__inner > .choices__list > .choices__item > button")
    .click();

  await assertNumCities(page, DEFAULT_CITY_RANGE);
});
