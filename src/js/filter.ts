/* global document, window */

import type Choices from "choices.js";
import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry, PopulationSliders } from "./types";

const POPULATION_INTERVALS: Array<[string, number]> = [
  ["100", 100],
  ["5k", 5000],
  ["25k", 25000],
  ["50k", 50000],
  ["100k", 100000],
  ["500k", 500000],
  ["1M", 1000000],
  ["5M", 5000000],
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
  const matchesSelected = (selector: string, entryKey: string): boolean => {
    const selectedValues = new Set(
      Array.from(
        document.querySelectorAll(`input[type=checkbox][name=${selector}]`)
      )
        .filter((option: HTMLInputElement) => option.checked)
        .map((option: HTMLInputElement) =>
          option.parentElement.textContent.trim()
        )
    );
    return entry[entryKey]
      .split(",")
      .some((value: string) => selectedValues.has(value));
  };

  const isScope = matchesSelected("scope", "report_magnitude");
  const isPolicy = matchesSelected("policy-change", "report_type");
  const isLand = matchesSelected("land-use", "land_uses");
  const isStage = matchesSelected("implementation-stage", "report_status");

  const noRequirementsToggleElement = document.getElementById(
    "no-requirements-toggle"
  ) as HTMLInputElement;
  const isNoRequirementsToggle =
    !noRequirementsToggleElement.checked || entry.is_no_mandate_city === "1";

  const population = parseInt(entry["population"]);
  const [sliderLeftIndex, sliderRightIndex] = sliders.getCurrentIndexes();
  const isPopulation =
    population >= POPULATION_INTERVALS[sliderLeftIndex][1] &&
    population <= POPULATION_INTERVALS[sliderRightIndex][1];

  return (
    isScope &&
    isPolicy &&
    isLand &&
    isStage &&
    isNoRequirementsToggle &&
    isPopulation
  );
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
  document
    .querySelectorAll("input[type=checkbox]")
    .forEach((option: HTMLInputElement) => {
      option.addEventListener("change", () => {
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

export { changeSelectedMarkers, POPULATION_INTERVALS, setUpAllFilters };
