import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

import Observable from "./Observable";
import { PlaceFilterManager } from "./FilterState";

// TODO: choosing a place snaps map location
// TODO: Improve UI for table view. We should always close the search popup and have a Reset link in the counter

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

  // Ensure that programmatic changes that set FilterState.searchInput to null
  // update the UI element too.
  filterManager.subscribe((state) => {
    if (state.searchInput === null) choices.setChoiceByValue("");
  });

  // User-driven inputs to search should update the FilterState.
  htmlElement.addEventListener("change", () =>
    filterManager.update({
      searchInput: (choices.getValue(true) as string) || null,
    }),
  );

  // Also set up the popup.
  initSearchPopup();
}
