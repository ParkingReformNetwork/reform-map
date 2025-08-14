import { CircleMarker, FeatureGroup, Map } from "leaflet";

import { NO_MANDATES_MARKERS_PANE } from "../layout/map";
import { PlaceFilterManager } from "../state/FilterState";
import { ViewStateObservable } from "../layout/viewToggle";
import type { PlaceId } from "../model/types";
import { radiusGivenZoom, determineIsPrimary } from "./markerUtils";

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

function updatePlaceVisibility(
  currentlyVisiblePlaceIds: Set<string>,
  newVisiblePlaceIds: Set<PlaceId>,
  placesToMarkers: Record<string, CircleMarker>,
  markerGroup: FeatureGroup,
): void {
  // Remove markers no longer visible.
  for (const placeId of currentlyVisiblePlaceIds) {
    if (!newVisiblePlaceIds.has(placeId)) {
      // @ts-expect-error the API allows passing a LayerGroup, but the type hint doesn't show this.
      placesToMarkers[placeId].removeFrom(markerGroup);
    }
  }

  // Add new markers not yet visible.
  for (const placeId of newVisiblePlaceIds) {
    if (!currentlyVisiblePlaceIds.has(placeId)) {
      placesToMarkers[placeId].addTo(markerGroup);
    }
  }
}

export default function initPlaceMarkers(
  filterManager: PlaceFilterManager,
  map: Map,
  viewToggle: ViewStateObservable,
): FeatureGroup {
  const placesToMarkers: Record<string, CircleMarker> = Object.entries(
    filterManager.entries,
  ).reduce((acc: Record<string, CircleMarker>, [placeId, entry]) => {
    const [long, lat] = entry.place.coord;
    const isPrimary = determineIsPrimary(entry);
    const style = isPrimary ? PRIMARY_MARKER_STYLE : SECONDARY_MARKER_STYLE;
    const marker = new CircleMarker([lat, long], {
      ...style,
      radius: radiusGivenZoom({ zoom: map.getZoom(), isPrimary }),
    });
    marker.bindTooltip(placeId);

    acc[placeId] = marker;
    return acc;
  }, {});

  const markerGroup = new FeatureGroup();
  let currentlyVisiblePlaceIds = new Set<string>();

  // When on table view, we should only lazily update the map the next time
  // we switch to map view.
  let dataRefreshQueued = false;

  filterManager.subscribe("update map markers", () => {
    if (viewToggle.getValue() === "table") {
      dataRefreshQueued = true;
      return;
    }

    updatePlaceVisibility(
      currentlyVisiblePlaceIds,
      filterManager.placeIds,
      placesToMarkers,
      markerGroup,
    );
    currentlyVisiblePlaceIds = filterManager.placeIds;
  });

  viewToggle.subscribe((view) => {
    if (view === "map" && dataRefreshQueued) {
      updatePlaceVisibility(
        currentlyVisiblePlaceIds,
        filterManager.placeIds,
        placesToMarkers,
        markerGroup,
      );
      currentlyVisiblePlaceIds = filterManager.placeIds;
      dataRefreshQueued = false;
    }
  }, "apply queued map data refresh");

  // Adjust marker size on zoom changes.
  map.addEventListener("zoomend", () => {
    const zoom = map.getZoom();
    Object.entries(placesToMarkers).forEach(([placeId, marker]) => {
      const newRadius = radiusGivenZoom({
        zoom,
        isPrimary: determineIsPrimary(filterManager.entries[placeId]),
      });
      marker.setRadius(newRadius);
    });
  });

  markerGroup.addTo(map);
  return markerGroup;
}
