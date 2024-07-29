import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const PLACE_MARKER = "path.leaflet-interactive";
const DEFAULT_PLACE_RANGE: [number, number] = [1600, 2600];

const loadMap = async (page: Page): Promise<void> => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(PLACE_MARKER);
};

const assertNumPlaces = async (
  page: Page,
  range: [number, number],
): Promise<void> => {
  const numPlaces = await page.locator(PLACE_MARKER).count();
  expect(numPlaces).toBeGreaterThanOrEqual(range[0]);
  expect(numPlaces).toBeLessThanOrEqual(range[1]);
  // Checks for accurate counter
  const numCounter = await page.locator("#counter-numerator").innerText();
  expect(numPlaces).toEqual(parseInt(numCounter.replace(/^\D+/g, ""), 10));
};

const deselectToggle = async (page: Page): Promise<void> => {
  // Default has requirement toggle on, so first de-select it, by opening filter pop-up and clicking toggle.
  await page.locator(".filters-popup-icon").click();
  await page.locator("#no-requirements-toggle").click({ force: true });
};

export { assertNumPlaces, loadMap, deselectToggle, DEFAULT_PLACE_RANGE };
