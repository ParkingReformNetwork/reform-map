import jquery from "jquery";
import "@selectize/selectize";
import "@selectize/selectize/dist/css/selectize.css";

// This exposes jQuery and the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

const setUpSearch = () => {
  $(".city-search").selectize({
    options: [
      { value: 1, text: "opt1" },
      { value: 2, text: "opt2" },
    ],
    placeholder: "City search",
  });
};

export default setUpSearch;
