import type { FeatureGroup, CircleMarker } from "leaflet";
import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

import type { CityId, CityEntry } from "./types";
import { changeSelectedMarkers } from "./filter";

const createSearchElement = (cityStates: Array<CityId>): Choices => {
  const cities = cityStates.map((cityState) => ({
    value: cityState,
    label: cityState,
  }));
  const element = document.querySelector(".city-search");
  return new Choices(element, {
    choices: cities,
    placeholderValue: "City search",
    removeItemButton: true,
    allowHTML: false,
    itemSelectText: "Select",
  });
};

const setUpSearch = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices
): void => {
  document
    .querySelector(".city-search")
    .addEventListener("change", () =>
      changeSelectedMarkers(markerGroup, citiesToMarkers, data, searchElement)
    );
};

export { createSearchElement, setUpSearch };
