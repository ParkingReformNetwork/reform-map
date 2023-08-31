/* global document, window */

import { marker } from "leaflet";

// can set default to certain filters
const onFilterChange = (markerGroup, citiesToMarkers, data) => () => {
  const checked = document.querySelectorAll(".filter--scope :checked");
  const selected = [...checked].map((option) => option.value);
  console.log(checked);
  console.log([...checked])
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (selected.some(scope => data[cityState]["report_magnitude"].includes(scope))) {
      marker.addTo(markerGroup);
    } else {
      marker.removeFrom(markerGroup);
    }
  });

  console.log(markerGroup.getLayers())
};

const setUpFilter = (markerGroup, citiesToMarkers, data) => {
  filter = document.querySelector(".filter--scope");

  filter.addEventListener(
    "change",
    onFilterChange(markerGroup, citiesToMarkers, data)
  );
};

export default setUpFilter;
