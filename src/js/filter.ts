/* global document, window */

import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry } from "./types";

/**
 * Helper function to iterate over every city and either remove it or add it,
 * depending on the result of filterFn for that city.
 */
const changeSelectedMarkers = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  filterFn: (cityState: CityId) => boolean
) => {
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (filterFn(cityState)) {
      marker.addTo(markerGroup);
    } else {
      // @ts-ignore the API allows passing a LayerGroup, but the type hint doesn't show this.
      marker.removeFrom(markerGroup);
    }
  });
};

// The double => is "partial application".
const onScopeFilterChange =
  (
    markerGroup: FeatureGroup,
    citiesToMarkers: Record<CityId, CircleMarker>,
    data: Record<CityId, CityEntry>
  ) =>
  (): void => {
    const selected = new Set(
      Array.from(document.querySelectorAll(".filter--scope :checked")).map(
        (option: HTMLInputElement) => option.value
      )
    );
    changeSelectedMarkers(markerGroup, citiesToMarkers, (cityState) =>
      data[cityState]["report_magnitude"]
        .split(",")
        .some((scope) => selected.has(scope))
    );
  };

const setUpFilter = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  const filter = document.querySelector(".filter--scope");
  // Pre-select all options.
  filter.querySelectorAll("option").forEach((option) => {
    option.selected = true;
  });
  filter.addEventListener(
    "change",
    onScopeFilterChange(markerGroup, citiesToMarkers, data)
  );
};

export { changeSelectedMarkers, setUpFilter };
