/* global document, window */
import { setUpPopulationSlider } from "./populationSlider";
import { setUpFilter } from "./filter";

const setUpFilterPopup = (
  markerGroup,
  citiesToMarkers,
  data,
  searchElement,
  sliders
) => {
  const popupElement = document.querySelector(
    ".filters-popup-window"
  ) as HTMLElement;
  const filterIcon = document.querySelector(
    ".filters-popup-icon"
  ) as HTMLElement;

  filterIcon.addEventListener("click", () => {
    popupElement.style.display =
      popupElement.style.display !== "block" ? "block" : "none";
  });

  filterIcon.addEventListener(
    "click",
    () => {
      setUpPopulationSlider(
        markerGroup,
        citiesToMarkers,
        data,
        searchElement,
        sliders
      );
      setUpFilter(markerGroup, citiesToMarkers, data, searchElement, sliders);
    },
    { once: true }
  );

  // closes window on clicks outside the info popup
  window.addEventListener("click", (event) => {
    if (
      event.target instanceof Node &&
      !filterIcon.contains(event.target) &&
      popupElement.style.display === "block" &&
      !popupElement.contains(event.target)
    ) {
      popupElement.style.display = "none";
      filterIcon.classList.toggle("active");
    }
  });
};

export default setUpFilterPopup;
