import type { CityId, CityEntry } from "./types";
import initIcons from "./fontAwesome";
import createMap from "./map";
import initCityMarkers from "./mapMarkers";
import initSearch from "./search";
import maybeDisableFullScreenIcon from "./iframe";
import initAbout from "./about";
import initScorecard from "./scorecard";
import { initPopulationSlider, POPULATION_MAX_INDEX } from "./populationSlider";
import initFilterOptions from "./filterOptions";
import initFilterPopup from "./filterPopup";
import { PlaceFilterManager } from "./FilterState";
import subscribeCounter from "./counter";

async function readData(): Promise<Record<CityId, CityEntry>> {
  // @ts-ignore
  const data = await import("../../map/tidied_map_data.csv");
  return data.reduce((acc: Record<string, CityEntry>, entry: CityEntry) => {
    const cityState = `${entry.city}, ${entry.state}`;
    acc[cityState] = entry;
    return acc;
  }, {});
}

export default async function initApp(): Promise<void> {
  initIcons();
  maybeDisableFullScreenIcon();
  initAbout();

  const map = createMap();
  const data = await readData();

  const filterManager = new PlaceFilterManager(data, {
    searchInput: [],
    noRequirementsToggle: true,
    policyChange: ["Eliminate Parking Minimums"],
    scope: [
      "Regional",
      "Citywide",
      "City Center/Business District",
      "Transit Oriented",
      "Main Street/Special",
    ],
    landUse: ["All Uses", "Commercial", "Residential"],
    implementationStage: ["Implemented", "Passed"],
    populationSliderIndexes: [0, POPULATION_MAX_INDEX],
  });

  const markerGroup = initCityMarkers(filterManager, map);
  subscribeCounter(filterManager);
  initScorecard(markerGroup, data);
  initSearch(filterManager);
  initFilterOptions(filterManager);
  initPopulationSlider(filterManager);
  initFilterPopup(filterManager);

  filterManager.initialize();
}
