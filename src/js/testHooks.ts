import type { FeatureGroup, Map as LeafletMap } from "leaflet";
import type { Tabulator } from "tabulator-tables";

declare global {
  interface Window {
    mapTestHandles?: { map: LeafletMap; markerGroup: FeatureGroup };
    tableTestHandles?: { table: Tabulator };
  }
}

/** Expose the map, marker group, and table for Playwright. */
export default function exposeTestHooks(
  map: LeafletMap,
  markerGroup: FeatureGroup,
  table: Tabulator,
): void {
  window.mapTestHandles = { map, markerGroup };
  window.tableTestHandles = { table };
}
