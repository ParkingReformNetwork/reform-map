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
  const filterPopupIsVisible = initFilterPopup();

  const map = createMap();
  const data = await readData();

  const filterManager = new PlaceFilterManager(data, {
    searchInput: null,
    noRequirementsToggle: true,
    policyChange: FilterOptions.getDefaultSelected("policyChange"),
    scope: FilterOptions.getDefaultSelected("scope"),
    landUse: FilterOptions.getDefaultSelected("landUse"),
    implementationStage: FilterOptions.getDefaultSelected(
      "implementationStage",
    ),
    populationSliderIndexes: [0, POPULATION_MAX_INDEX],
  });

  const markerGroup = initPlaceMarkers(filterManager, map);
  subscribeSnapToPlace(filterManager, map);
  initCounters(filterManager);
  initSearch(filterManager);
  initFilterOptions(filterManager);
  initPopulationSlider(filterManager, filterPopupIsVisible);

  const table = initTable(filterManager);
  const viewToggle = initViewToggle(table);

  initScorecard(filterManager, viewToggle, markerGroup, data);

  viewToggle.initialize();
  filterPopupIsVisible.initialize();
  filterManager.initialize();
}
