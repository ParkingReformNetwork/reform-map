/* global document, window */

// can set default to certain filters
const onFilterChange = (markerGroup, citiesToMarkers, data) => () => {
  const checked = document.querySelectorAll(".scope-filter :checked");
  const selected = [...checked].map((option) => option.value)[0];
  console.log(selected);
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    console.log("in here");
    if (data[cityState]["report_magnitude"].includes(selected)) {
      marker.addTo(markerGroup);
    } else {
      marker.removeFrom(markerGroup);
    }
  });
};

const setUpFilter = (markerGroup, citiesToMarkers, data) => {
  filter = document.querySelector(".scope-filter");

  filter.addEventListener(
    "click",
    onFilterChange(markerGroup, citiesToMarkers, data)
  );
};

export default setUpFilter;
