import type { Page } from "@playwright/test";

const CITY_MARKER = "path.leaflet-interactive";

const loadMap = async (page: Page): Promise<void> => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(CITY_MARKER);
};

const getNumCities = async (page: Page): Promise<number> =>
  page.locator(CITY_MARKER).count();

export { getNumCities, loadMap };
