import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const PLACE_MARKER = "path.leaflet-interactive";
const DEFAULT_PLACE_RANGE: [number, number] = [2930, 4000];

const loadMap = async (page: Page): Promise<void> => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(PLACE_MARKER);
};

const assertNumPlaces = async (
  page: Page,
  range: [number, number],
): Promise<void> => {
  const mapNumPlaces = await page.locator(PLACE_MARKER).count();
  expect(mapNumPlaces).toBeGreaterThanOrEqual(range[0]);
  expect(mapNumPlaces).toBeLessThanOrEqual(range[1]);

  const counter = await page.locator("#map-counter").innerText();
  const counterNumMatch = counter.match(/\d+/);
  const counterNumPlaces = counterNumMatch
    ? parseInt(counterNumMatch[0], 10)
    : 0;
  expect(mapNumPlaces).toEqual(counterNumPlaces);
};

const deselectToggle = async (page: Page): Promise<void> => {
  // Default has requirement toggle on, so first de-select it by opening filter pop-up and clicking toggle.
  await page.locator(".header-filter-icon-container").click();
  await page.locator("#no-requirements-toggle").click({ force: true });
};

export { assertNumPlaces, loadMap, deselectToggle, DEFAULT_PLACE_RANGE };
