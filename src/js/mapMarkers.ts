import { CircleMarker, FeatureGroup, Map } from "leaflet";

import { PlaceFilterManager } from "./FilterState";

const MARKER_STYLE = {
  radius: 7,
  stroke: true,
  weight: 0.9,
  color: "#FFFFFF",
  fillColor: "#d7191c",
  fillOpacity: 1,
} as const;

export default function initCityMarkers(
  filterManager: PlaceFilterManager,
  map: Map,
): FeatureGroup {
  const markerGroup = new FeatureGroup();

  const placesToMarkers: Record<string, CircleMarker> = Object.entries(
    filterManager.entries,
  ).reduce((acc, [cityState, entry]) => {
    // @ts-ignore: passing strings to CircleMarker for lat/lng is valid, and
    // parsing to ints would lose precision.
    const marker = new CircleMarker([entry.lat, entry.long], MARKER_STYLE);
    acc[cityState] = marker;

    marker.bindTooltip(cityState);
    marker.addTo(markerGroup);
    return acc;
  }, {});

  // When the filter state changes, update what gets rendered.
  filterManager.subscribe(() => {
    Object.entries(placesToMarkers).forEach(([placeId, marker]) => {
      if (filterManager.placeIds.has(placeId)) {
        marker.addTo(markerGroup);
      } else {
        // @ts-ignore the API allows passing a LayerGroup, but the type hint doesn't show this.
        marker.removeFrom(markerGroup);
      }
    });
  });

  markerGroup.addTo(map);
  return markerGroup;
}
