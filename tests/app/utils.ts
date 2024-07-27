import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const CITY_MARKER = "path.leaflet-interactive";
const DEFAULT_CITY_RANGE: [number, number] = [1600, 2600];

const loadMap = async (page: Page): Promise<void> => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(CITY_MARKER);
};

const assertNumCities = async (
  page: Page,
  range: [number, number],
): Promise<void> => {
  const numCities = await page.locator(CITY_MARKER).count();
  expect(numCities).toBeGreaterThanOrEqual(range[0]);
  expect(numCities).toBeLessThanOrEqual(range[1]);
  // Checks for accurate city counter
  const numCounter = await page.locator("#counter-numerator").innerText();
  expect(numCities).toEqual(parseInt(numCounter.replace(/^\D+/g, ""), 10));
};

const deselectToggle = async (page: Page): Promise<void> => {
  // Default has requirement toggle on, so first de-select it, by opening filter pop-up and clicking toggle.
  await page.locator(".filters-popup-icon").click();
  await page.locator("#no-requirements-toggle").click({ force: true });
};

export { assertNumCities, loadMap, deselectToggle, DEFAULT_CITY_RANGE };
