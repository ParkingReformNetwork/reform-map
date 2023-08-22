import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

// Using `=>` twice allows for partial application. The caller can pre-set the `map`,
// `citiesToMarkers`, and `choices` arguments. That results in a function that works with
// the event listener.
const onChange = (map, citiesToMarkers, choices) => () => {
  const selectedSet = new Set(choices.getValue(true));
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (selectedSet.size === 0 || selectedSet.has(cityState)) {
      marker.addTo(map);
    } else {
      marker.remove();
    }
  });
};

const setUpSearch = (map, citiesToMarkers) => {
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
  element.addEventListener("change", onChange(map, citiesToMarkers, choices));
};

export default setUpSearch;
