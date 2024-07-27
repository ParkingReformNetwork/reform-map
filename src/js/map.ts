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
  // Set default view to Lexington, KY, to fit the most dots by
  // default. On desktop, the whole US fits. But on mobile, the
  // screen is too small so we center around the eastern US.
  map.setView([38.0406, -84.5037], 4);
  map.attributionControl.setPrefix(
    '<a href="https://parkingreform.org/support/">Parking Reform Network</a>',
  );
  return map;
}
