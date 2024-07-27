import { CircleMarker, FeatureGroup } from "leaflet";

import type { CityId, CityEntry } from "./types";
import initIcons from "./fontAwesome";
import createMap from "./map";
import { createSearchElement, initSearch } from "./search";
import maybeDisableFullScreenIcon from "./iframe";
import initAbout from "./about";
import initScorecard from "./scorecard";
import { createPopulationSlider } from "./populationSlider";
import { changeSelectedMarkers, initFiltersAndCounter } from "./filter";
import initFilterPopup from "./filterPopup";

/**
 * Read the CSV and return an object with `City, State` as the key and the original entry as the value.
 */
async function readData(): Promise<Record<CityId, CityEntry>> {
  // @ts-ignore
  const data = await import("../../map/tidied_map_data.csv");
  return data.reduce((acc: Record<string, CityEntry>, entry: CityEntry) => {
    const cityState = `${entry.city}, ${entry.state}`;
    acc[cityState] = entry;
    return acc;
  }, {});
}

/**
 * Returns an object mapping cityState to its CircleMarker.
 */
function createCityMarkers(
  data: Record<CityId, CityEntry>,
  markerGroup: FeatureGroup,
): Record<string, CircleMarker> {
  return Object.entries(data).reduce((acc, [cityState, entry]) => {
    // @ts-ignore: passing strings to CircleMarker for lat/lng is valid, and
    // parsing to ints would lose precision.
    const marker = new CircleMarker([entry.lat, entry.long], {
      radius: 7,
      stroke: true,
      weight: 0.9,
      color: "#FFFFFF",
      fillColor: "#d7191c",
      fillOpacity: 1,
    });
    acc[cityState] = marker;

    marker.bindTooltip(cityState);
    marker.addTo(markerGroup);
    return acc;
  }, {});
}

export default async function initApp(): Promise<void> {
  initIcons();
  maybeDisableFullScreenIcon();
  initAbout();

  const map = createMap();
  const markerGroup = new FeatureGroup();
  const sliders = createPopulationSlider();

  const data = await readData();
  const searchElement = createSearchElement(Object.keys(data));
  const citiesToMarkers = createCityMarkers(data, markerGroup);

  initScorecard(markerGroup, data);
  initSearch(markerGroup, citiesToMarkers, data, searchElement, sliders);
  initFiltersAndCounter(
    markerGroup,
    citiesToMarkers,
    data,
    searchElement,
    sliders,
  );
  initFilterPopup(markerGroup, citiesToMarkers, data, searchElement, sliders);

  // Finally, apply our default filters to change what is pre-selected,
  // then render the cities.
  changeSelectedMarkers(
    markerGroup,
    citiesToMarkers,
    data,
    searchElement,
    sliders,
  );
  markerGroup.addTo(map);
}
