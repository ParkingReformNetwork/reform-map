import jquery from "jquery";
import "@selectize/selectize";
import "@selectize/selectize/dist/css/selectize.css";

// This exposes jQuery and the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

const setUpSearch = (data) => {
  const cities = data.map((entry) => {
    const desc = `${entry.city}, ${entry.state}`;
    return { value: desc, text: desc };
  });
  $(".city-search").selectize({
    options: cities,
    placeholder: "City search",
  });
};

export default setUpSearch;
