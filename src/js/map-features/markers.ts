import { CircleMarker, FeatureGroup, Map } from "leaflet";

import { PlaceFilterManager } from "../state/FilterState";
import { ViewStateObservable } from "../layout/viewToggle";
import type { PlaceId } from "../model/types";
import { radiusGivenZoom, determineIsPrimary } from "./markerUtils";
import { determinePlaceIdWithoutCountry } from "../model/placeId";

const PRIMARY_MARKER_STYLE = {
  weight: 1,
  color: "white",
  fillColor: "#d7191c",
  fillOpacity: 1,
} as const;

const SECONDARY_MARKER_STYLE = {
  weight: 1,
  color: "white",
  fillColor: "#fdae61",
  fillOpacity: 1,
} as const;

/** We store the placeId on the marker to know which place a Marker corresponds to. */
export type MarkerWithPlaceId = CircleMarker & {
  placeId: PlaceId;
  isPrimary: boolean;
};

function updatePlaceVisibility(
  currentlyVisiblePlaceIds: Set<string>,
  newVisiblePlaceIds: Set<PlaceId>,
  placesToMarkers: Record<string, MarkerWithPlaceId>,
  markerGroup: FeatureGroup,
): void {
  // Keep track of primary markers so that we can ensure they render on top of secondary ones.
  const visiblePrimaryMarkers: MarkerWithPlaceId[] = [];

  // Remove markers no longer visible and check if any existing markers are primary.
  for (const placeId of currentlyVisiblePlaceIds) {
    const marker = placesToMarkers[placeId];
    if (!newVisiblePlaceIds.has(placeId)) {
      // @ts-expect-error the API allows passing a LayerGroup, but the type hint doesn't show this.
      marker.removeFrom(markerGroup);
    }
    if (marker.isPrimary) visiblePrimaryMarkers.push(marker);
  }

  // Add newly visible markers.
  for (const placeId of newVisiblePlaceIds) {
    const marker = placesToMarkers[placeId];
    if (!currentlyVisiblePlaceIds.has(placeId)) {
      marker.addTo(markerGroup);
    }
    if (marker.isPrimary) visiblePrimaryMarkers.push(marker);
  }

  for (const marker of visiblePrimaryMarkers) {
    marker.bringToFront();
  }
}

export default function initPlaceMarkers(
  filterManager: PlaceFilterManager,
  map: Map,
  viewToggle: ViewStateObservable,
): FeatureGroup {
  const placesToMarkers: Record<string, MarkerWithPlaceId> = Object.entries(
    filterManager.entries,
  ).reduce((acc: Record<string, MarkerWithPlaceId>, [placeId, entry]) => {
    const [long, lat] = entry.place.coord;
    const isPrimary = determineIsPrimary(entry);
    const style = isPrimary ? PRIMARY_MARKER_STYLE : SECONDARY_MARKER_STYLE;
    const marker = new CircleMarker([lat, long], {
      ...style,
      radius: radiusGivenZoom({ zoom: map.getZoom(), isPrimary }),
    }) as MarkerWithPlaceId;
    marker.placeId = placeId;
    marker.isPrimary = isPrimary;

    // The tooltip is the text shown on hover. We strip the country
    // to make it less verbose.
    marker.bindTooltip(determinePlaceIdWithoutCountry(entry.place));

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
    Object.values(placesToMarkers).forEach((marker) => {
      const newRadius = radiusGivenZoom({
        zoom,
        isPrimary: marker.isPrimary,
      });
      marker.setRadius(newRadius);
    });
  });

  markerGroup.addTo(map);
  return markerGroup;
}
