import initIcons from "./layout/fontAwesome";
import createMap from "./layout/map";
import initFilterPopup from "./layout/filterPopup";
import maybeDisableFullScreenIcon from "./layout/iframe";
import initAbout from "./layout/about";
import { initViewToggle, addViewToggleSubscribers } from "./layout/viewToggle";
import readData from "./model/data";
import { PlaceFilterManager } from "./state/FilterState";
import { POPULATION_MAX_INDEX } from "./filter-features/populationSlider";
import { FilterOptions, initFilterOptions } from "./filter-features/options";
import initCounters from "./filter-features/counters";
import subscribeSnapToPlace from "./map-features/position";
import initPlaceMarkers from "./map-features/markers";
import initScorecard from "./map-features/scorecard";
import initSearch from "./search";
import initTable from "./table";

export default async function initApp(): Promise<void> {
  initIcons();
  maybeDisableFullScreenIcon();
  initAbout();
  initFilterPopup();

  const viewToggle = initViewToggle();

  const filterOptions = new FilterOptions();
  const map = createMap();
  const data = await readData();

  const filterManager = new PlaceFilterManager(data, {
    searchInput: null,
    policyTypeFilter: "remove parking minimums",
    status: "adopted",
    allMinimumsRemovedToggle: true,
    placeType: new Set(filterOptions.merged.placeType),
    includedPolicyChanges: new Set(filterOptions.merged.includedPolicyChanges),
    scope: new Set(filterOptions.merged.scope),
    landUse: new Set(filterOptions.merged.landUse),
    country: new Set(filterOptions.merged.country),
    year: new Set(filterOptions.merged.year),
    populationSliderIndexes: [0, POPULATION_MAX_INDEX],
  });

  const markerGroup = initPlaceMarkers(filterManager, map, viewToggle);
  subscribeSnapToPlace(filterManager, map);
  initCounters(filterManager);
  initSearch(filterManager);
  initFilterOptions(filterManager, filterOptions);

  const table = initTable(filterManager, viewToggle);
  addViewToggleSubscribers(viewToggle, table);

  initScorecard(filterManager, viewToggle, markerGroup, data);

  viewToggle.initialize();
  filterManager.initialize();
}
