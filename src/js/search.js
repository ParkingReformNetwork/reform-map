import { Control, DomEvent, DomUtil } from "leaflet";
import jquery from "jquery";
import "@selectize/selectize";
import "@selectize/selectize/dist/css/selectize.css";

// This exposes jQuery and the $ symbol. See
// https://stackoverflow.com/a/47984928.
window.$ = window.jQuery = jquery;

const setUpSearch = (map, data) => {
  const search = new Control({ position: "topleft" });
  search.onAdd = () => {
    const select = DomUtil.create("select", "city-search");
    select.setAttribute("multiple", "");
    // Turn off dragging of map.
    DomEvent.on(select, "click", DomEvent.stopPropagation);
    return select;
  };
  search.addTo(map);

  const cities = data.map((entry) => {
    const desc = `${entry.city}, ${entry.state}`;
    return { value: desc, text: desc };
  });

  // Convert `<select>` into selectize component.
  $(".city-search").selectize({
    options: cities,
    placeholder: "City search",
  });

  // Turn off dragging of map with option dropdown.
  const dropdown = document.querySelector(".city-search.selectize-dropdown");
  DomEvent.on(dropdown, "mousedown", DomEvent.stopPropagation);
  DomEvent.on(dropdown, "click", DomEvent.stopPropagation);
};

export default setUpSearch;
