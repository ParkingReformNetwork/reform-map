import { expect, test } from "@playwright/test";
import { loadMap, cityDetailsIsVisible } from "./utils";

test("city details pops up", async ({ page }) => {
  await loadMap(page);

  // click on marker
  await page.locator(".leaflet-interactive").first().click({ force: true });
  expect(await cityDetailsIsVisible(page)).toBe(true);
  // close popup
  await page.locator(".city-details-popup-close-icon").click();
  expect(await cityDetailsIsVisible(page)).toBe(false);

  // click on marker
  await page.locator("path:nth-child(4)").click({ force: true });
  expect(await cityDetailsIsVisible(page)).toBe(true);
  // click on another marker
  await page.locator("path:nth-child(8)").click({ force: true });
  expect(await cityDetailsIsVisible(page)).toBe(true);
  // close popup
  await page.locator(".city-details-popup-close-icon").click();
  expect(await cityDetailsIsVisible(page)).toBe(false);
});
