import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { CircleMarker } from "leaflet";

import { readRawCoreData } from "../../scripts/lib/data";
import type {
  ProcessedCoreEntry,
  ProcessedPlace,
} from "../../src/js/model/types";

export function makePlace(
  overrides: Partial<ProcessedPlace> = {},
): ProcessedPlace {
  return {
    name: "Place",
    state: "",
    country: "United States",
    type: "city",
    encoded: "",
    pop: 48100,
    repeal: false,
    coord: [0, 0],
    url: "",
    ...overrides,
  };
}

export function makeEntry(
  overrides: Partial<ProcessedCoreEntry> = {},
): ProcessedCoreEntry {
  return {
    place: makePlace(),
    ...overrides,
  };
}

export const DEFAULT_ALL_MINIMUMS_RANGE: [number, number] = [120, 200];
export const DEFAULT_PLACE_RANGE: [number, number] = [6000, 8500];

export const HEADER_ICON = {
  about: ".header-about-icon-container",
  filter: ".header-filter-icon-container",
  map: ".header-map-icon-container",
  search: ".header-search-icon-container",
  table: ".header-table-icon-container",
};

export async function loadMap(page: Page): Promise<void> {
  await page.goto("");
  // Wait until markers have been added to the map.
  await page.waitForFunction(
    () => (window.mapTestHandles?.markerGroup.getLayers().length ?? 0) > 0,
  );
}

async function getNumMapMarkers(page: Page): Promise<number> {
  return page.evaluate(
    () => window.mapTestHandles?.markerGroup.getLayers().length ?? 0,
  );
}

export async function getTotalNumPlaces(): Promise<number> {
  const data = await readRawCoreData();
  return Object.keys(data).length;
}

export async function assertNumPlaces(
  page: Page,
  range: [number, number],
): Promise<void> {
  await expect
    .poll(() => getNumMapMarkers(page))
    .toBeGreaterThanOrEqual(range[0]);
  const mapNumPlaces = await getNumMapMarkers(page);
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
}

/**
 * Get the viewport pixel coordinates for markers currently on screen.
 */
export async function onScreenMarkerPoints(
  page: Page,
): Promise<Array<{ x: number; y: number }>> {
  return page.evaluate(() => {
    const handles = window.mapTestHandles;
    if (!handles) return [];
    const { map, markerGroup } = handles;
    const rect = map.getContainer().getBoundingClientRect();
    const size = map.getSize();
    const points: Array<{ x: number; y: number }> = [];
    markerGroup.getLayers().forEach((layer) => {
      const point = map.latLngToContainerPoint(
        (layer as CircleMarker).getLatLng(),
      );
      // Keep a 20px horizontal inset off the left/right edges, and restrict
      // vertically to the 25%-70% band. This avoids the overlays that sit on top
      // of the map canvas and would otherwise intercept the click: the header
      // and search/filter icons near the top, and the counter and attribution
      // near the bottom.
      if (
        point.x > 20 &&
        point.x < size.x - 20 &&
        point.y > size.y * 0.25 &&
        point.y < size.y * 0.7
      ) {
        points.push({
          x: Math.round(rect.left + point.x),
          y: Math.round(rect.top + point.y),
        });
      }
    });
    return points;
  });
}

export async function openFilter(page: Page): Promise<void> {
  await page.locator(HEADER_ICON.filter).click();
}

export async function selectToggle(page: Page): Promise<void> {
  await page.locator("#filter-all-minimums-toggle-label").click();
}

/** Uncheck all countries, then check only the given one. Assumes the filter is open. */
export async function filterToCountry(page: Page, name: string): Promise<void> {
  await page.locator("#filter-accordion-toggle-country").click();
  await page.locator("#filter-country-uncheck-all").click();
  await page
    .locator(`.filter-country label:has(input[data-value="${name}"])`)
    .click();
}
