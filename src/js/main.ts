import initIcons from "./layout/fontAwesome";
import createMap from "./layout/map";
import initFilterPopup from "./layout/filterPopup";
import maybeDisableFullScreenIcon from "./layout/iframe";
import maybeHideMapOverlays from "./layout/hideMapOverlays";
import initShareLink from "./layout/share";
import initAbout from "./layout/about";
import { initViewToggle, addViewToggleSubscribers } from "./layout/viewToggle";
import readData from "./model/data";
import { PlaceFilterManager } from "./state/FilterState";
import { decodeFilterState } from "./state/urlEncoder";
import { initFilterOptions } from "./filter-features/options";
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
  addViewToggleSubscribers(viewToggle, table);

  initScorecard(filterManager, viewToggle, markerGroup, data);

  viewToggle.initialize();
  filterManager.initialize();
}

window.onload = async () => {
  await initApp();
};
