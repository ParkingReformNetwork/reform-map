import { expect, test } from "@playwright/test";
import { loadMap, getNumCities } from "./utils";

test("scope filter updates markers", async ({ page }) => {
  await loadMap(page);

  const all = await getNumCities(page);

  const checkMarkers = async () => {
    const cities = await getNumCities(page);
    return cities > 0 && cities < all;
  };

  await page.selectOption(".filter--scope", "Regional");
  expect(await checkMarkers()).toBe(true);

  await page.selectOption(".filter--scope", "Citywide");
  expect(await checkMarkers()).toBe(true);

  await page.selectOption(".filter--scope", "City Center");
  expect(await checkMarkers()).toBe(true);

  await page.selectOption(".filter--scope", "Transit Oriented");
  expect(await checkMarkers()).toBe(true);

  await page.selectOption(".filter--scope", "Main Street");
  expect(await checkMarkers()).toBe(true);

  await page.selectOption(".filter--scope", [
    "Transit Oriented",
    "City Center",
  ]);
  expect(await checkMarkers()).toBe(true);
});
