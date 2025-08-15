import { test } from "@playwright/test";

import {
  assertNumPlaces,
  loadMap,
  openFilter,
  DEFAULT_PLACE_RANGE,
} from "./utils";

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);
  await openFilter(page);

  await page.locator(".header-search-icon-container").click();
  await page
    .locator(".choices__list--dropdown > .choices__list > .choices__item")
    .nth(2)
    .click();
  await assertNumPlaces(page, [1, 1]);

  // Removing the selected place, by closing scorecard, restores all.
  await page.locator(".scorecard-close-icon-container").click();
  await assertNumPlaces(page, DEFAULT_PLACE_RANGE);
});
