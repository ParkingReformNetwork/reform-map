import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const CITY_MARKER = "path.leaflet-interactive";
const DEFAULT_CITY_RANGE: [number, number] = [1550, 1800];

const loadMap = async (page: Page): Promise<void> => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(CITY_MARKER);
};

const assertNumCities = async (
  page: Page,
  range: [number, number]
): Promise<void> => {
  const numCities = await page.locator(CITY_MARKER).count();
  expect(numCities).toBeGreaterThanOrEqual(range[0]);
  expect(numCities).toBeLessThanOrEqual(range[1]);
  // Checks for accurate city counter
  const numCounter = await page.locator("#counter-numerator").innerText();
  expect(numCities).toEqual(parseInt(numCounter.replace(/^\D+/g, ""), 10));
};

export { assertNumCities, loadMap, DEFAULT_CITY_RANGE };
