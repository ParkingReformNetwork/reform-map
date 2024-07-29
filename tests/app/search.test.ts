import { test } from "@playwright/test";

import {
  assertNumPlaces,
  loadMap,
  deselectToggle,
  DEFAULT_PLACE_RANGE,
} from "./utils";

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);

  await deselectToggle(page);

  await page.locator(".choices").click();
  await page
    .locator(".choices__list--dropdown > .choices__list > .choices__item")
    .first()
    .click();
  await assertNumPlaces(page, [1, 1]);

  // Removing the selected places restores all.
  await page
    .locator(".choices__inner > .choices__list > .choices__item > button")
    .click();

  await assertNumPlaces(page, DEFAULT_PLACE_RANGE);
});
