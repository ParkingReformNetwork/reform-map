import { Map, TileLayer, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";

import setUpIcons from "./fontAwesome";
import addLegend from "./legend";
import setUpSearch from "./search";

const BASE_LAYER = new TileLayer(
  "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}",
  {
    attribution:
      'Map tiles: <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>',
    subdomains: "abcd",
    minZoom: 0,
    maxZoom: 10,
    ext: "png",
  }
);

const SCOPE_TO_COLOR = {
  Regional: "#7b3294",
  "City Center": "#fdae61",
  Citywide: "#d7191c",
  "Main Street": "#abdda4",
  TOD: "#2b83ba",
};

const createMap = () => {
  const map = new Map("map", {
    layers: [BASE_LAYER],
  });
  map.setView([43.2796758, -96.7449732], 4); // Set default view (lat, long) to United States
  map.attributionControl.setPrefix(
    'Map data: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  );
  return map;
};

/**
 * Read the CSV and return an object with `City, State` as the key and the original entry as the value.
 */
const readData = async () => {
  const data = await import("../../map/tidied_map_data.csv");
  return data.reduce((acc, entry) => {
    const cityState = `${entry.city}, ${entry.state}`;
    acc[cityState] = entry;
    return acc;
  }, {});
};

/**
 * Returns an object mapping cityState to its CircleMarker.
 */
const createCityMarkers = (map, data) =>
  Object.entries(data).reduce((acc, [cityState, entry]) => {
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
    marker.addTo(map);
    return acc;
  }, {});

const setUpSite = async () => {
  setUpIcons();
  const map = createMap();
  addLegend(map, SCOPE_TO_COLOR);

  const data = await readData();
  const citiesToMarkers = createCityMarkers(map, data);
  setUpSearch(citiesToMarkers);
};

export default setUpSite;
