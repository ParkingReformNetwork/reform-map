import jquery from "jquery";
import "@selectize/selectize";
import "@selectize/selectize/dist/css/selectize.css";

// This exposes jQuery and the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

// Using `=>` twice allows for partial application. The caller can pre-set the `map` and
// `citiesToMarkers` arguments. That results in a function that takes only one value
// for `currentlySelected`, which is what selectize expects with its `onChange` argument.
const onChange = (map, citiesToMarkers) => (currentlySelected) => {
  const selectedSet = new Set(currentlySelected);
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
    text: cityState,
  }));
  $(".city-search").selectize({
    options: cities,
    placeholder: "City search",
    onChange: onChange(map, citiesToMarkers),
    maxOptions: 3000,
  });
};

export default setUpSearch;
