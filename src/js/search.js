import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

// Using `=>` twice allows for partial application. The caller can pre-set the `markerGroup`,
// `citiesToMarkers`, and `choices` arguments. That results in a function that works with
// the event listener.
const onChange = (markerGroup, citiesToMarkers, choices) => () => {
  const selectedSet = new Set(choices.getValue(true));
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (selectedSet.size === 0 || selectedSet.has(cityState)) {
      marker.addTo(markerGroup);
    } else {
      marker.removeFrom(markerGroup);
    }
  });
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
