import jquery from "jquery";

// jQuery is not set up with ES6 modules and Parcel by default.
// This defines the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

const setUpSearch = () => {
  $(".city-search");
//   $(".city-search").selectize({
//     options: [
//       { key: 1, title: "opt1" },
//       { key: 2, title: "opt2" },
//     ],
//   });
};

export default setUpSearch;
