import { expect, test } from "@playwright/test";
import { loadMap } from "./utils";

test("city details pops up", async ({ page }) => {
  await loadMap(page);

  const cityDetailsIsVisible = async () =>
    page.$eval(".city-details-popup", (el) => el.style.display === "block");

  // click on marker
  await page.locator(".leaflet-interactive").first().click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // close popup
  await page.locator(".city-details-popup-close-icon").click();
  expect(await cityDetailsIsVisible()).toBe(false);

  // click on marker
  await page.locator("path:nth-child(4)").click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // click on another marker
  await page.locator("path:nth-child(8)").click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // close popup
  await page.locator(".city-details-popup-close-icon").click();
  expect(await cityDetailsIsVisible()).toBe(false);
});
