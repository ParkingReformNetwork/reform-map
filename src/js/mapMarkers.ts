import { CircleMarker, FeatureGroup, Map } from "leaflet";

import { NO_MANDATES_MARKERS_PANE } from "./map";
import { PlaceFilterManager } from "./FilterState";

const PRIMARY_MARKER_STYLE = {
  weight: 1,
  color: "white",
  fillColor: "#d7191c",
  fillOpacity: 1,
  pane: NO_MANDATES_MARKERS_PANE,
} as const;

const SECONDARY_MARKER_STYLE = {
  weight: 1,
  color: "white",
  fillColor: "#fdae61",
  fillOpacity: 1,
} as const;

function radiusGivenZoom(options: {
  zoom: number;
  isPrimary: boolean;
}): number {
  const { zoom, isPrimary } = options;
  // This formula comes from Claude to go from radius 5 to 21 between zoom 3 to 10
  // with roughly linear growth.
  //
  // 21px radius => 42px diameter + 2px stroke == 4px. That meets the accessibility
  // requirement of 44px touch target size, while balancing the dot not being too big
  // on the screen when zoomed out.
  const base = Math.round(2.37 * zoom - 2.29);
  return isPrimary ? base + 2 : base;
}

export default function initPlaceMarkers(
  filterManager: PlaceFilterManager,
  map: Map,
): FeatureGroup {
  const markerGroup = new FeatureGroup();
  let currentlyVisiblePlaceIds = new Set<string>();

  const placesToMarkers: Record<string, CircleMarker> = Object.entries(
    filterManager.entries,
  ).reduce((acc: Record<string, CircleMarker>, [placeId, entry]) => {
    const isPrimary = entry.place.repeal;
    const style = isPrimary ? PRIMARY_MARKER_STYLE : SECONDARY_MARKER_STYLE;

    const [long, lat] = entry.place.coord;
    const marker = new CircleMarker([lat, long], {
      ...style,
      radius: radiusGivenZoom({ zoom: map.getZoom(), isPrimary }),
    });

    marker.bindTooltip(placeId);
    acc[placeId] = marker;
    return acc;
  }, {});

  // When the filter state changes, update what gets rendered.
  filterManager.subscribe(() => {
    const newVisiblePlaceIds = filterManager.placeIds;

    // Remove markers no longer visible.
    for (const placeId of currentlyVisiblePlaceIds) {
      if (!newVisiblePlaceIds.has(placeId)) {
        // @ts-ignore the API allows passing a LayerGroup, but the type hint doesn't show this.
        placesToMarkers[placeId].removeFrom(markerGroup);
      }
    }

    // Add new markers not yet visible.
    for (const placeId of newVisiblePlaceIds) {
      if (!currentlyVisiblePlaceIds.has(placeId)) {
        placesToMarkers[placeId].addTo(markerGroup);
      }
    }

    currentlyVisiblePlaceIds = newVisiblePlaceIds;
  });

  // Adjust marker size on zoom changes.
  map.addEventListener("zoomend", () => {
    const zoom = map.getZoom();
    Object.entries(placesToMarkers).forEach(([placeId, marker]) => {
      const isPrimary = filterManager.entries[placeId].place.repeal;
      const newRadius = radiusGivenZoom({ zoom, isPrimary });
      marker.setRadius(newRadius);
    });
  });

  markerGroup.addTo(map);
  return markerGroup;
}
