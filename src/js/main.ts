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
import { PlaceFilterManager, PolicyTypeFilter } from "./FilterState";
import initCounters from "./counters";
import initViewToggle from "./viewToggle";
import initTable from "./table";
import subscribeSnapToPlace from "./mapPosition";
import readData from "./data";

function policyTypeFilterFromUrl(): PolicyTypeFilter {
  const typeParam = new URLSearchParams(window.location.search).get("type");
  switch (typeParam) {
    case "any":
      return "any parking reform";
    case "max":
      return "add parking maximums";
    case "rm":
      return "remove parking minimums";
    case "reduce":
      return "reduce parking minimums";
    default:
      return "legacy reform";
  }
}

export default async function initApp(): Promise<void> {
  initIcons();
  maybeDisableFullScreenIcon();
  initAbout();
  const filterPopupIsVisible = initFilterPopup();

  const policyTypeFilter = policyTypeFilterFromUrl();

  const map = createMap();
  const data = await readData({
    includeMultipleReforms: policyTypeFilter !== "legacy reform",
  });

  const filterOptions = new FilterOptions(Object.values(data));

  const filterManager = new PlaceFilterManager(data, {
    searchInput: null,
    policyTypeFilter,
    allMinimumsRemovedToggle: true,
    includedPolicyChanges: filterOptions.default("includedPolicyChanges"),
    scope: filterOptions.default("scope"),
    landUse: filterOptions.default("landUse"),
    status: filterOptions.default("status"),
    country: filterOptions.default("country"),
    year: filterOptions.default("year"),
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
