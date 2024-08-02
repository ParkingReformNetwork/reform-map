import { Map, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

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

export default function createMap(): Map {
  const map = new Map("map", {
    layers: [BASE_LAYER],
    worldCopyJump: true,
  });
  // Set default view show all the US on mobile. While this is fairly zoomed out,
  // the main purpose of the map on initial load is to tell the narrative that parking
  // reform is popular, i.e. there are a lot of dots. Search, filter, and table view are
  // meant for power users doing actual research.
  map.setView([40, -96], 3);
  map.attributionControl.setPrefix(
    '<a href="https://parkingreform.org/support/">Parking Reform Network</a>',
  );
  return map;
}
