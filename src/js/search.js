import jquery from "jquery";
import "@selectize/selectize";
import "@selectize/selectize/dist/css/selectize.css";

// This exposes jQuery and the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

const setUpSearch = () => {
  $(".city-search").selectize({
    options: [
      { key: 1, title: "opt1" },
      { key: 2, title: "opt2" },
    ],
  });
};

export default setUpSearch;
