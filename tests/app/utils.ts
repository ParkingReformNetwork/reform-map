import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { readRawCoreData } from "../../scripts/lib/data";

const PLACE_MARKER = "path.leaflet-interactive";

export const DEFAULT_ALL_MINIMUMS_RANGE: [number, number] = [95, 135];
export const DEFAULT_PLACE_RANGE: [number, number] = [3100, 4100];

export const loadMap = async (page: Page): Promise<void> => {
  await page.goto("?revamp");
  // Wait for data to load.
  await page.waitForSelector(PLACE_MARKER);
};

export async function getTotalNumPlaces(): Promise<number> {
  const data = await readRawCoreData();
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
  if (counter.includes("reset search")) {
    counterNumPlaces = 1;
  } else {
    const counterNumMatch = counter.match(/\d+/);
    counterNumPlaces = counterNumMatch ? parseInt(counterNumMatch[0], 10) : 0;
  }
  expect(mapNumPlaces).toEqual(counterNumPlaces);
};

export async function openFilter(page: Page): Promise<void> {
  await page.locator(".header-filter-icon-container").click();
}

export const deselectToggle = async (page: Page): Promise<void> => {
  await page.locator("#filter-all-minimums-toggle-label").click();
};
