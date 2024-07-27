import type Choices from "choices.js";
import type { FeatureGroup, CircleMarker } from "leaflet";

import { initPopulationSlider } from "./populationSlider";
import Observable from "./Observable";
import type { CityId, CityEntry, PopulationSliders } from "./types";

function updateFilterPopupUI(isVisible: boolean): void {
  const popup = document.querySelector<HTMLElement>(".filters-popup-window");
  if (!popup) return;
  popup.style.display = isVisible ? "block" : "none";
}

export default function initFilterPopup(
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices,
  sliders: PopulationSliders,
) {
  const isVisible = new Observable<boolean>(false);
  isVisible.subscribe(updateFilterPopupUI);

  // We init the population slider on the first slide because it requires the popup
  // to be displayed to compute offsetWidth.
  let hasInitedPopulation = false;
  isVisible.subscribe((visible) => {
    if (!hasInitedPopulation && visible) {
      initPopulationSlider(
        markerGroup,
        citiesToMarkers,
        data,
        searchElement,
        sliders,
      );
      hasInitedPopulation = true;
    }
  });

  const popup = document.querySelector(".filters-popup-window");
  const openFilter = document.querySelector(".open-filter");

  openFilter.addEventListener("click", () => {
    isVisible.setValue(!isVisible.getValue());
  });

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (
      isVisible.getValue() === true &&
      event.target instanceof Element &&
      !openFilter?.contains(event.target) &&
      !popup?.contains(event.target)
    ) {
      isVisible.setValue(false);
    }
  });

  isVisible.initialize();
}
