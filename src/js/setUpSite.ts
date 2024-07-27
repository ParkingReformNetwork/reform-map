import { Map, TileLayer, CircleMarker, FeatureGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { CityId, CityEntry } from "./types";
import setUpIcons from "./fontAwesome";
import { createSearchElement, setUpSearch } from "./search";
import maybeDisableFullScreenIcon from "./iframe";
import setUpAbout from "./about";
import setUpScorecard from "./scorecard";
import { createPopulationSlider } from "./populationSlider";
import { changeSelectedMarkers, setUpFiltersAndCounter } from "./filter";
import setUpFilterPopup from "./filterPopup";

const BASE_LAYER = new TileLayer(
  "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
  {
    attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
        &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
        &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
        &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a>`,
    subdomains: "abcd",
    minZoom: 0,
    maxZoom: 10,
  },
);

function createMap(): Map {
  const map = new Map("map", {
    layers: [BASE_LAYER],
    worldCopyJump: true,
  });
  // Set default view to Lexington, KY, to fit the most dots by
  // default. On desktop, the whole US fits. But on mobile, the
  // screen is too small so we center around the eastern US.
  map.setView([38.0406, -84.5037], 4);
  map.attributionControl.setPrefix(
    '<a href="https://parkingreform.org/support/">Parking Reform Network</a>',
  );
  return map;
}

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

export default async function setUpSite(): Promise<void> {
  setUpIcons();
  maybeDisableFullScreenIcon();
  setUpAbout();

  const map = createMap();
  const markerGroup = new FeatureGroup();
  const sliders = createPopulationSlider();

  const data = await readData();
  const searchElement = createSearchElement(Object.keys(data));
  const citiesToMarkers = createCityMarkers(data, markerGroup);

  setUpScorecard(markerGroup, data);
  setUpSearch(markerGroup, citiesToMarkers, data, searchElement, sliders);
  setUpFiltersAndCounter(
    markerGroup,
    citiesToMarkers,
    data,
    searchElement,
    sliders,
  );
  setUpFilterPopup(markerGroup, citiesToMarkers, data, searchElement, sliders);

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
