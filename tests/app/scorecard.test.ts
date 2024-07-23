import { expect, test } from "@playwright/test";
import { loadMap } from "./utils";

test("scorecard pops up and closes", async ({ page }) => {
  await loadMap(page);
  const closeIcon = page.locator(".scorecard-close-icon-container");

  const cityDetailsIsVisible = async () =>
    page.$eval(
      ".scorecard-container",
      (el) => el instanceof HTMLElement && !el.hidden
    );

  // click on marker
  await page.locator(".leaflet-interactive").first().click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // close popup
  await closeIcon.click();
  expect(await cityDetailsIsVisible()).toBe(false);

  // click on marker
  await page.locator("path:nth-child(4)").click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // click on another marker
  await page.locator("path:nth-child(8)").click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // close popup
  await closeIcon.click();
  expect(await cityDetailsIsVisible()).toBe(false);

  // click on marker
  await page.locator(".leaflet-interactive").first().click({ force: true });
  expect(await cityDetailsIsVisible()).toBe(true);
  // click outside of popup (not a marker either)
  await page.click("header");
  expect(await cityDetailsIsVisible()).toBe(false);
});
