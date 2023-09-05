/* global document, window */

const setUpFilter = (markerGroup, citiesToMarkers, data) => {
  const filter = document.querySelector(".filter--scope");
  const priorSelection = [
    "Regional",
    "Citywide",
    "City Center",
    "Transit Oriented",
    "Main Street",
  ];

  const onScopeFilterChange = (markerGroup, citiesToMarkers, data) => () => {
    const selected = new Set(
      [...document.querySelectorAll(".filter--scope :checked")].map(
        (option) => option.value
      )
    );
    Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
      if (
        data[cityState]["report_magnitude"]
          .split(",")
          .some((scope) => selected.has(scope))
      ) {
        marker.addTo(markerGroup);
      } else {
        marker.removeFrom(markerGroup);
      }
    });
  };

  // makes all options selected
  filter.querySelectorAll("option").forEach((option) => {
    option.selected = priorSelection.includes(option.value);
  });

  filter.addEventListener(
    "change",
    onScopeFilterChange(markerGroup, citiesToMarkers, data)
  );
};

export default setUpFilter;
