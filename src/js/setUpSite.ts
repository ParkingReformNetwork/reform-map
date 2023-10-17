import { Map, TileLayer, CircleMarker, FeatureGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

import type { CityId, CityEntry } from "./types";
import setUpIcons from "./fontAwesome";
import addLegend from "./legend";
import { createSearchElement, setUpSearch } from "./search";
import { setUpShareIcon } from "./share";
import setUpAbout from "./about";
import setUpDetails from "./cityDetails";
import { createPopulationSlider } from "./populationSlider";
import { changeSelectedMarkers, setUpAllFilters } from "./filter";
import setUpFilterPopup from "./filterPopup";

const BASE_LAYER = new TileLayer(
  "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
  {
    attribution: `Map tiles: &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
      &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a>
      &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>`,
    subdomains: "abcd",
    minZoom: 0,
    maxZoom: 10,
  }
);

const SCOPE_TO_COLOR = {
  Regional: "#7b3294",
  "City Center": "#fdae61",
  Citywide: "#d7191c",
  "Main Street": "#abdda4",
  TOD: "#2b83ba",
};

const createMap = (): Map => {
  const map = new Map("map", {
    layers: [BASE_LAYER],
  });
  map.setView([43.2796758, -96.7449732], 4); // Set default view (lat, long) to United States
  map.attributionControl.setPrefix(
    'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  );
  return map;
};

/**
 * Read the CSV and return an object with `City, State` as the key and the original entry as the value.
 */
const readData = async (): Promise<Record<CityId, CityEntry>> => {
  // @ts-ignore
  const data = await import("../../map/tidied_map_data.csv");
  return data.reduce((acc: Record<string, CityEntry>, entry: CityEntry) => {
    const cityState = `${entry.city}, ${entry.state}`;
    acc[cityState] = entry;
    return acc;
  }, {});
};

/**
 * Returns an object mapping cityState to its CircleMarker.
 */
const createCityMarkers = (
  data: Record<CityId, CityEntry>,
  markerGroup: FeatureGroup
): Record<string, CircleMarker> =>
  Object.entries(data).reduce((acc, [cityState, entry]) => {
    // @ts-ignore: passing strings to CircleMarker for lat/lng is valid, and
    // parsing to ints would lose precision.
    const marker = new CircleMarker([entry.lat, entry.long], {
      radius: 7,
      stroke: true,
      weight: 0.9,
      color: "#FFFFFF",
      fillColor: SCOPE_TO_COLOR[entry.magnitude_encoded],
      fillOpacity: 1,
    });
    acc[cityState] = marker;

    marker.bindTooltip(cityState);
    marker.addTo(markerGroup);
    return acc;
  }, {});

const setUpSite = async (): Promise<void> => {
  setUpIcons();
  setUpAbout();
  setUpShareIcon();
  const map = createMap();
  const markerGroup = new FeatureGroup();
  const sliders = createPopulationSlider();
  addLegend(map, SCOPE_TO_COLOR);

  const data = await readData();
  const searchElement = createSearchElement(Object.keys(data));
  const citiesToMarkers = createCityMarkers(data, markerGroup);

  setUpDetails(markerGroup, data);
  setUpSearch(markerGroup, citiesToMarkers, data, searchElement, sliders);
  setUpAllFilters(markerGroup, citiesToMarkers, data, searchElement, sliders);
  setUpFilterPopup(markerGroup, citiesToMarkers, data, searchElement, sliders);

  // Finally, apply our default filters to change what is pre-selected,
  // then render the cities.
  changeSelectedMarkers(
    markerGroup,
    citiesToMarkers,
    data,
    searchElement,
    sliders
  );
  markerGroup.addTo(map);
};

export default setUpSite;
