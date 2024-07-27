import type { FeatureGroup, CircleMarker } from "leaflet";
import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

import type { CityId, CityEntry, PopulationSliders } from "./types";
import { changeSelectedMarkers } from "./filter";

export function createSearchElement(cityStates: Array<CityId>): Choices {
  const cities = cityStates.map((cityState) => ({
    value: cityState,
    label: cityState,
  }));
  const element = document.querySelector(".city-search");
  return new Choices(element, {
    position: "bottom",
    choices: cities,
    placeholderValue: "City search",
    removeItemButton: true,
    allowHTML: false,
    itemSelectText: "Select",
  });
}

export function setUpSearch(
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices,
  sliders: PopulationSliders
): void {
  document
    .querySelector(".city-search")
    .addEventListener("change", () =>
      changeSelectedMarkers(
        markerGroup,
        citiesToMarkers,
        data,
        searchElement,
        sliders
      )
    );
}
