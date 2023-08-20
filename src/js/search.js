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
  $(".city-search").selectize({
    options: cities,
    placeholder: "City search",
  });

  // TODO: turn off dragging with the dropdown.
};

export default setUpSearch;
