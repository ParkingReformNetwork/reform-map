/* global document, window */
import { setUpPopulationSlider } from "./populationSlider";
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
  const openFilter = document.querySelector(".open-filter") as HTMLElement;

  openFilter.addEventListener("click", () => {
    popupElement.style.display =
      popupElement.style.display !== "block" ? "block" : "none";
  });

  openFilter.addEventListener(
    "click",
    () => {
      // This happens here because the filter popup must be displayed for
      // the offsetWidth calculation to work properly.
      setUpPopulationSlider(
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
      !openFilter.contains(event.target) &&
      popupElement.style.display === "block" &&
      !popupElement.contains(event.target)
    ) {
      popupElement.style.display = "none";
      openFilter.classList.toggle("active");
    }
  });
};

export default setUpFilterPopup;
