import jquery from "jquery";
import "@selectize/selectize";
import "@selectize/selectize/dist/css/selectize.css";

// This exposes jQuery and the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

const onChange = (currentlySelected) => console.log(currentlySelected);

const setUpSearch = (citiesToMarkers) => {
  const cities = Object.keys(citiesToMarkers).map((cityState) => ({
    value: cityState,
    text: cityState,
  }));
  $(".city-search").selectize({
    options: cities,
    placeholder: "City search",
    onChange,
  });
};

export default setUpSearch;
