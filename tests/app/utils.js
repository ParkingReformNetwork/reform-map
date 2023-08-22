const CITY_MARKER = "path.leaflet-interactive";

const loadMap = async (page) => {
  await page.goto("");
  // Wait for data to load.
  await page.waitForSelector(CITY_MARKER);
};

const getNumCities = async (page) => page.locator(CITY_MARKER).count();

export { getNumCities, loadMap };
