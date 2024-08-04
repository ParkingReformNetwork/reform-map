import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

import Observable from "./Observable";
import { PlaceFilterManager } from "./FilterState";

// TODO: choosing a city 1) closes search, 2) pulls up scorecard, and 3) snaps map location
// TODO: closing a scorecard resets search
// TODO: better styling of remove option, somehow

function updateSearchPopupUI(isVisible: boolean) {
  const popup = document.querySelector<HTMLElement>("#search-popup");
  const icon = document.querySelector(".header-search-icon-container");
  if (!popup || !icon) return;
  popup.hidden = !isVisible;
  icon.ariaExpanded = isVisible.toString();
}

function initSearchPopup(): void {
  const isVisible = new Observable<boolean>(false);
  isVisible.subscribe(updateSearchPopupUI);

  const popup = document.querySelector("#search-popup");
  const selectElement = document.querySelector<HTMLInputElement>("div.choices");
  const icon = document.querySelector(".header-search-icon-container");

  icon.addEventListener("click", () => {
    isVisible.setValue(!isVisible.getValue());
    setTimeout(() => selectElement.click(), 100);
  });

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (
      isVisible.getValue() === true &&
      event.target instanceof Element &&
      !icon?.contains(event.target) &&
      !popup?.contains(event.target)
    ) {
      isVisible.setValue(false);
    }
  });

  isVisible.initialize();
}

export default function initSearch(filterManager: PlaceFilterManager): void {
  const places = Object.keys(filterManager.entries).map((placeId) => ({
    value: placeId,
    label: placeId,
  }));
  const htmlElement = document.querySelector(".search");
  const choices = new Choices(htmlElement, {
    position: "bottom",
    choices: places,
    placeholderValue: "Search",
    removeItemButton: true,
    allowHTML: false,
    itemSelectText: "",
    searchEnabled: true,
  });

  // Set initial state.
  choices.setChoiceByValue(filterManager.getState().searchInput);

  htmlElement.addEventListener("change", () =>
    filterManager.update({
      searchInput: (choices.getValue(true) as string) || null,
    }),
  );

  // Also set up the popup.
  initSearchPopup();
}
