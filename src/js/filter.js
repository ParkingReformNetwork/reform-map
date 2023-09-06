/* global document, window */

/**
 * Helper function to iterate over every city and either remove it or add it,
 * depending on the result of filterFn for that city.
 *
 * @param filterFn: a function of (string) => boolean. That is, a function that takes
 *    one argument for the cityState name, e.g. 'Boston, MA', and returns true if it
 *    should be displayed on the map.
 */
const changeSelectedMarkers = (markerGroup, citiesToMarkers, filterFn) => {
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (filterFn(cityState)) {
      marker.addTo(markerGroup);
    } else {
      marker.removeFrom(markerGroup);
    }
  });
};

// The double => is "partial application".
const onScopeFilterChange = (markerGroup, citiesToMarkers, data) => () => {
  const selected = new Set(
    [...document.querySelectorAll(".filter--scope :checked")].map(
      (option) => option.value
    )
  );
  changeSelectedMarkers(markerGroup, citiesToMarkers, (cityState) =>
    data[cityState]["report_magnitude"]
      .split(",")
      .some((scope) => selected.has(scope))
  );
};

const setUpFilter = (markerGroup, citiesToMarkers, data) => {
  const filter = document.querySelector(".filter--scope");
  // Pre-select all options.
  filter.querySelectorAll("option").forEach((option) => {
    option.selected = true;
  });
  filter.addEventListener(
    "change",
    onScopeFilterChange(markerGroup, citiesToMarkers, data)
  );
};

export { changeSelectedMarkers, setUpFilter };
