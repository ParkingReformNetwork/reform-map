/* global document, window */
import { setUpPopulationSlider } from "./populationSlider";
import { setUpAllFilters } from "./filter";
import type Choices from "choices.js";
import type { FeatureGroup, CircleMarker } from "leaflet";
import type { CityId, CityEntry, PopulationSliders } from "./types";

const setUpFilterPopup = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices,
  sliders: PopulationSliders
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
      setUpAllFilters(
        markerGroup,
        citiesToMarkers,
        data,
        searchElement,
        sliders
      );
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
