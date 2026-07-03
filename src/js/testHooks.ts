import type { FeatureGroup, Map } from "leaflet";

declare global {
  interface Window {
    mapTestHandles?: { map: Map; markerGroup: FeatureGroup };
  }
}

/**
 * Expose the map and marker group for Playwright.
 *
 * Canvas rendering paints every marker onto one shared `<canvas>`, so there is no
 * per-marker DOM for tests to select. These handles let tests count markers
 * (`markerGroup.getLayers().length`) and project marker coordinates to pixels to
 * simulate real clicks.
 */
export default function exposeTestHooks(
  map: Map,
  markerGroup: FeatureGroup,
): void {
  window.mapTestHandles = { map, markerGroup };
}
