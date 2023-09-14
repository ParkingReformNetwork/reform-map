/* global document, window */

import type Choices from "choices.js";
import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry } from "./types";

/**
 * Return true if the city should be rendered on the map.
 *
 * Note that search takes priority. If certain cities are selected via
 * search, they should be shown regardless of the filters.
 */
const shouldBeRendered = (
  cityState: CityId,
  entry: CityEntry,
  searchElement: Choices
): boolean => {
  const searchChosen = new Set(searchElement.getValue(true) as string[]);
  if (searchChosen.size > 0) {
    return searchChosen.has(cityState);
  }

  // Else, search is not used and the filters should apply.
  const getSelected = (cls: string): Set<string> =>
    new Set(
      Array.from(document.querySelectorAll(cls)).map(
        (option: HTMLInputElement) => option.value
      )
    );

  const scopeSelected = getSelected(".filter--scope :checked");
  const isScope = entry["report_magnitude"]
    .split(",")
    .some((scope) => scopeSelected.has(scope));

  return isScope;
};

/**
 * Helper function to iterate over every city and either remove it or add it,
 * based on the search and filter values.
 *
 * This should be used with an event listener for each filter and search, whenever
 * their values change.
 */
const changeSelectedMarkers = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices
) => {
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (shouldBeRendered(cityState, data[cityState], searchElement)) {
      marker.addTo(markerGroup);
    } else {
      // @ts-ignore the API allows passing a LayerGroup, but the type hint doesn't show this.
      marker.removeFrom(markerGroup);
    }
  });
};

const setUpFilter = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices
): void => {
  document
    .querySelector(".filter--scope")
    .addEventListener("change", () =>
      changeSelectedMarkers(markerGroup, citiesToMarkers, data, searchElement)
    );
};

export { changeSelectedMarkers, setUpFilter, shouldBeRendered };
