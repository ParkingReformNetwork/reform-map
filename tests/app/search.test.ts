import { test } from "@playwright/test";

import { assertNumCities, loadMap, DEFAULT_CITY_RANGE } from "./utils";

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);

  // Default has requirement toggle on, so first de-select it, but opening filter pop-up and clicking toggle.
  await page.locator(".filters-popup-icon").click();
  await page.locator("#no-requirements-toggle").click({ force: true });

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
