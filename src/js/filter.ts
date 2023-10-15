/* global document, window */

import type Choices from "choices.js";
import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry, PopulationSliders } from "./types";

const POPULATION_INTERVALS: Array<[string, number]> = [
  ["100", 100],
  ["500", 500],
  ["1k", 1000],
  ["5k", 5000],
  ["10k", 10000],
  ["50k", 50000],
  ["100k", 100000],
  ["500k", 500000],
  ["1M", 1000000],
  ["5M", 5000000],
  ["10M", 10000000],
  ["50M", 50000000],
];

/**
 * Return true if the city should be rendered on the map.
 *
 * Note that search takes priority. If certain cities are selected via
 * search, they should be shown regardless of the filters.
 */
const shouldBeRendered = (
  cityState: CityId,
  entry: CityEntry,
  searchElement: Choices,
  sliders: PopulationSliders
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

  const scopeSelected = getSelected(".scope :checked");
  const isScope = entry["report_magnitude"]
    .split(",")
    .some((scope) => scopeSelected.has(scope));
  const policySelected = getSelected(".policy-change :checked");
  const isPolicy = entry["report_type"]
    .split(",")
    .some((policy) => policySelected.has(policy));
  const landSelected = getSelected(".land-use :checked");
  const isLand = entry["land_uses"]
    .split(",")
    .some((land) => landSelected.has(land));
  const stageSelected = getSelected(".implementation-stage :checked");
  const isStage = entry["report_status"]
    .split(",")
    .some((stage) => stageSelected.has(stage));

  const population = parseInt(entry["population"]);
  const [sliderLeftIndex, sliderRightIndex] = sliders.getCurrentIndexes();
  const isPopulation =
    population >= POPULATION_INTERVALS[sliderLeftIndex][1] &&
    population <= POPULATION_INTERVALS[sliderRightIndex][1];

  return isScope && isPolicy && isLand && isStage && isPopulation;
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
  searchElement: Choices,
  sliders: PopulationSliders
) => {
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (shouldBeRendered(cityState, data[cityState], searchElement, sliders)) {
      marker.addTo(markerGroup);
    } else {
      // @ts-ignore the API allows passing a LayerGroup, but the type hint doesn't show this.
      marker.removeFrom(markerGroup);
    }
  });
};

const setUpAllFilters = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices,
  sliders: PopulationSliders
): void => {
  // We don't want each click to reset the selection. Instead, each click updates the selection by adding or removing a single selection.
  // As a result, the user won't have to use shift, ctrl/cmd to make complicated selections.
  const FILTER_TYPE = [
    "scope",
    "policy-change",
    "land-use",
    "implementation-stage",
  ];

  FILTER_TYPE.forEach((filterType: string): void => {
    document.querySelector(`.${filterType}`).addEventListener("change", () => {
      changeSelectedMarkers(
        markerGroup,
        citiesToMarkers,
        data,
        searchElement,
        sliders
      );
    });
  });
};

export {
  changeSelectedMarkers,
  POPULATION_INTERVALS,
  setUpAllFilters,
  shouldBeRendered,
};
