import initCounters from "./filter-features/counters";
import { initFilterOptions } from "./filter-features/options";
import initAbout from "./layout/about";
import initFilterPopup from "./layout/filterPopup";
import maybeHideMapOverlays from "./layout/hideMapOverlays";
import maybeDisableFullScreenIcon from "./layout/iframe";
import createMap from "./layout/map";
import initShareLink from "./layout/share";
import { addViewToggleSubscribers, initViewToggle } from "./layout/viewToggle";
import initPlaceMarkers from "./map-features/markers";
import subscribeSnapToPlace from "./map-features/position";
import initScorecard from "./map-features/scorecard";
import readData from "./model/data";
import initSearch from "./search";
import { PlaceFilterManager } from "./state/FilterState";
import { decodeFilterState } from "./state/urlEncoder";
import initTable from "./table";
import exposeTestHooks from "./testHooks";

export default async function initApp(): Promise<void> {
  maybeDisableFullScreenIcon();
  initAbout();
  initFilterPopup();

  const viewToggle = initViewToggle();

  const map = createMap();
  maybeHideMapOverlays(window.location.search);

  const data = await readData();

  const initialState = decodeFilterState(window.location.search);
  const filterManager = new PlaceFilterManager(data, initialState);

  const markerGroup = initPlaceMarkers(filterManager, map, viewToggle);
  subscribeSnapToPlace(filterManager, map);
  initCounters(filterManager);
  initSearch(filterManager);
  initFilterOptions(filterManager);
  initShareLink(filterManager);

  const table = initTable(filterManager, viewToggle);
  exposeTestHooks(map, markerGroup, table);
  addViewToggleSubscribers(viewToggle, table);

  initScorecard(filterManager, viewToggle, markerGroup);

  viewToggle.initialize();
  filterManager.initialize();
}

window.onload = async () => {
  await initApp();
};
