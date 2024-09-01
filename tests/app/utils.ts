import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { readCoreData } from "../../scripts/lib/data";

const PLACE_MARKER = "path.leaflet-interactive";
export const DEFAULT_PLACE_RANGE: [number, number] = [3000, 4000];

export const loadMap = async (page: Page): Promise<void> => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(PLACE_MARKER);
};

export async function getTotalNumPlaces(): Promise<number> {
  const data = await readCoreData();
  return Object.keys(data).length;
}

export const assertNumPlaces = async (
  page: Page,
  range: [number, number],
): Promise<void> => {
  const mapNumPlaces = await page.locator(PLACE_MARKER).count();
  expect(mapNumPlaces).toBeGreaterThanOrEqual(range[0]);
  expect(mapNumPlaces).toBeLessThanOrEqual(range[1]);

  const counter = await page.locator("#map-counter").innerText();
  let counterNumPlaces: number;
  if (counter.includes("from search")) {
    counterNumPlaces = 1;
  } else {
    const counterNumMatch = counter.match(/\d+/);
    counterNumPlaces = counterNumMatch ? parseInt(counterNumMatch[0], 10) : 0;
  }
  expect(mapNumPlaces).toEqual(counterNumPlaces);
};

export const deselectToggle = async (page: Page): Promise<void> => {
  // Default has requirement toggle on, so first de-select it by opening filter pop-up and clicking toggle.
  await page.locator(".header-filter-icon-container").click();
  await page.locator(".all-minimums-toggle").click();
};
