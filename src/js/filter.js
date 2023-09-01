/* global document, window */

const setUpFilter = (markerGroup, citiesToMarkers, data) => {
  const filter = document.querySelector(".filter--scope");
  let priorSelection = [
    "Regional",
    "Citywide",
    "City Center",
    "Transit Oriented",
    "Main Street",
  ];

  const onScopeFilterChange = (markerGroup, citiesToMarkers, data) => () => {
    const checked = document.querySelectorAll(".filter--scope :checked");
    const selected = [...checked].map((option) => option.value);
    Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
      if (
        selected.some((scope) =>
          data[cityState]["report_magnitude"].includes(scope)
        )
      ) {
        marker.addTo(markerGroup);
      } else {
        marker.removeFrom(markerGroup);
      }
    });
  };

  filter.querySelectorAll("option").forEach((option) => {
    option.selected = priorSelection.includes(option.value);
  });

  filter.addEventListener(
    "change",
    onScopeFilterChange(markerGroup, citiesToMarkers, data)
  );
};

export default setUpFilter;
