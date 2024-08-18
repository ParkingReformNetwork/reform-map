import type { PlaceId, PlaceEntry } from "./types";
import initIcons from "./fontAwesome";
import createMap from "./map";
import initPlaceMarkers from "./mapMarkers";
import initSearch from "./search";
import maybeDisableFullScreenIcon from "./iframe";
import initAbout from "./about";
import initScorecard from "./scorecard";
import { initPopulationSlider, POPULATION_MAX_INDEX } from "./populationSlider";
import { FilterOptions, initFilterOptions } from "./filterOptions";
import initFilterPopup from "./filterPopup";
import { PlaceFilterManager } from "./FilterState";
import initCounters from "./counters";
import initViewToggle from "./viewToggle";
import initTable from "./table";
import subscribeSnapToPlace from "./mapPosition";
import readData from "./data";

export default async function initApp(): Promise<void> {
  initIcons();
  maybeDisableFullScreenIcon();
  initAbout();
  const filterPopupIsVisible = initFilterPopup();

  const map = createMap();
  const data = await readData();

  const filterOptions = new FilterOptions(Object.values(data));

  const filterManager = new PlaceFilterManager(data, {
    searchInput: null,
    allMinimumsRepealedToggle: true,
    policyChange: filterOptions.default("policyChange"),
    scope: filterOptions.default("scope"),
    landUse: filterOptions.default("landUse"),
    status: filterOptions.default("status"),
    populationSliderIndexes: [0, POPULATION_MAX_INDEX],
  });

  const markerGroup = initPlaceMarkers(filterManager, map);
  subscribeSnapToPlace(filterManager, map);
  initCounters(filterManager);
  initSearch(filterManager);
  initFilterOptions(filterManager, filterOptions);
  initPopulationSlider(filterManager, filterPopupIsVisible);

  const table = initTable(filterManager);
  const viewToggle = initViewToggle(table);

  initScorecard(filterManager, viewToggle, markerGroup, data);

  viewToggle.initialize();
  filterPopupIsVisible.initialize();
  filterManager.initialize();
}
