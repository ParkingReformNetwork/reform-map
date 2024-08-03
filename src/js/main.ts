import type { PlaceId, PlaceEntry } from "./types";
import initIcons from "./fontAwesome";
import createMap from "./map";
import initPlaceMarkers from "./mapMarkers";
import initSearch from "./search";
import maybeDisableFullScreenIcon from "./iframe";
import initAbout from "./about";
import initScorecard from "./scorecard";
import { initPopulationSlider, POPULATION_MAX_INDEX } from "./populationSlider";
import initFilterOptions from "./filterOptions";
import initFilterPopup from "./filterPopup";
import { PlaceFilterManager } from "./FilterState";
import subscribeCounter from "./counter";
import viewToggle from "./viewToggle";
import initViewToggle from "./viewToggle";

async function readData(): Promise<Record<PlaceId, PlaceEntry>> {
  // @ts-ignore
  const data = await import("../../map/tidied_map_data.csv");
  return data.reduce((acc: Record<string, PlaceEntry>, entry: PlaceEntry) => {
    const placeId = `${entry.city}, ${entry.state}`;
    acc[placeId] = entry;
    return acc;
  }, {});
}

export default async function initApp(): Promise<void> {
  initIcons();
  maybeDisableFullScreenIcon();
  initAbout();
  initViewToggle();

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

  const markerGroup = initPlaceMarkers(filterManager, map);
  subscribeCounter(filterManager);
  initScorecard(markerGroup, data);
  initSearch(filterManager);
  initFilterOptions(filterManager);
  initPopulationSlider(filterManager);
  initFilterPopup(filterManager);

  filterManager.initialize();
}
