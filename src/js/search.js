import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

import { changeSelectedMarkers } from "./filter";

// The double => is "partial application".
const onChange = (markerGroup, citiesToMarkers, choices) => () => {
  const selectedSet = new Set(choices.getValue(true));
  changeSelectedMarkers(
    markerGroup,
    citiesToMarkers,
    (cityState) => selectedSet.size === 0 || selectedSet.has(cityState)
  );
};

const setUpSearch = (markerGroup, citiesToMarkers) => {
  const cities = Object.keys(citiesToMarkers).map((cityState) => ({
    value: cityState,
    label: cityState,
  }));
  const element = document.querySelector(".city-search");
  const choices = new Choices(element, {
    choices: cities,
    placeholderValue: "City search",
    removeItemButton: true,
    allowHTML: false,
    itemSelectText: "Select",
  });
  element.addEventListener(
    "change",
    onChange(markerGroup, citiesToMarkers, choices)
  );
};

export default setUpSearch;
