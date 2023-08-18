import { Map, TileLayer, CircleMarker, Control, DomUtil } from "leaflet";
import "leaflet/dist/leaflet.css";

import setUpIcons from "./fontAwesome";

const BASE_LAYER = new TileLayer(
  "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}",
  {
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abcd",
    minZoom: 0,
    maxZoom: 20,
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
    'created by <a style="padding: 0 3px 0 3px; color:#fafafa; background-color: #21ccb9;" href=http://www.geocadder.bg/en/>GEOCADDER</a>'
  );
  return map;
};

const addLegend = (map) => {
  const legend = new Control({ position: "bottomright" });
  legend.onAdd = () => {
    const div = DomUtil.create("div", "legend");
    const scopes = [
      { key: "Regional", label: "Regional" },
      { key: "Citywide", label: "Citywide" },
      { key: "City Center", label: "City Center/District" },
      { key: "TOD", label: "Transit Oriented" },
      { key: "Main Street", label: "Main Street/Special" },
    ];
    const listItems = scopes
      .map(
        (scope) => `
          <li>
            <i style="background:${SCOPE_TO_COLOR[scope.key]};"></i>${
          scope.label
        }
          </li>`
      )
      .join("");
    div.innerHTML += `<h2>Scope of reform</h2><ul>${listItems}</ul>`;
    return div;
  };
  legend.addTo(map);
};

const setUpCityPointsLayer = async (map) => {
  const data = await import("../../map/tidied_map_data.csv");
  data.forEach((mandate) => {
    new CircleMarker([mandate.lat, mandate.long], {
      radius: 7,
      stroke: true,
      weight: 0.9,
      color: "#FFFFFF",
      fillColor: SCOPE_TO_COLOR[mandate.magnitude_encoded],
      fillOpacity: 1,
    }).addTo(map);
  });
};

const setUpSite = async () => {
  setUpIcons();
  const map = createMap();
  addLegend(map);
  await setUpCityPointsLayer(map);
};

export default setUpSite;
