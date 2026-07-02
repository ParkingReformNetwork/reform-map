import Choices from "choices.js";

import Observable from "./state/Observable";
import { PlaceFilterManager } from "./state/FilterState";

function updateSearchPopupUI(isVisible: boolean) {
  const popup = document.querySelector<HTMLElement>("#search-popup");
  const icon = document.querySelector(".header-search-icon-container");
  if (!popup || !icon) return;
  popup.hidden = !isVisible;
  icon.ariaExpanded = isVisible.toString();
}

type SearchPopupObservable = Observable<boolean>;

function initSearchPopup(onFirstOpen: () => void): SearchPopupObservable {
  const isVisible = new Observable<boolean>("search popup", false);
  isVisible.subscribe(updateSearchPopupUI);

  const popup = document.querySelector("#search-popup");
  const icon = document.querySelector(".header-search-icon-container");
  if (!icon) throw new Error("icon not found");

  icon.addEventListener("click", () => {
    const nowVisible = !isVisible.getValue();
    isVisible.setValue(nowVisible);
    // Build the (expensive) Choices widget lazily on first open. `div.choices`
    // does not exist until then, so query it after building.
    if (nowVisible) onFirstOpen();
    setTimeout(
      () => document.querySelector<HTMLElement>("div.choices")?.click(),
      100,
    );
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
  return isVisible;
}

export default function initSearch(filterManager: PlaceFilterManager): void {
  const htmlElement = document.querySelector(".search");
  if (!htmlElement) return;

  // Building Choices.js with the full set of places is expensive (~93ms), so
  // defer it until the user first opens the search popup.
  let choices: Choices | null = null;

  const buildChoices = (): void => {
    if (choices) return;
    const places = Object.entries(filterManager.entries).map(
      ([placeId, entry]) => ({
        value: placeId,
        label: placeId,
        customProperties: {
          place: entry.place.name,
          state: entry.place.state ?? "",
          country: entry.place.country,
        },
      }),
    );

    choices = new Choices(htmlElement, {
      position: "bottom",
      choices: places,
      placeholderValue: "Search",
      removeItemButton: true,
      allowHTML: false,
      itemSelectText: "",
      searchEnabled: true,
      searchResultLimit: 10,
      searchFields: [
        "label",
        "customProperties.place",
        "customProperties.state",
        "customProperties.country",
      ],
    });

    // Set initial state.
    choices.setChoiceByValue(filterManager.getState().searchInput || "");
  };

  // Also set up the popup, which builds Choices on first open.
  const popupIsVisible = initSearchPopup(buildChoices);

  // Ensure that programmatic changes that set FilterState.searchInput to null
  // update the UI element too.
  filterManager.subscribe("reset search UI when search is cleared", (state) => {
    if (state.searchInput === null) choices?.setChoiceByValue("");
  });

  // User-driven inputs to search should update the FilterState.
  htmlElement.addEventListener("change", () => {
    if (!choices) return;
    filterManager.update({
      searchInput: (choices.getValue(true) as string) || null,
    });
    popupIsVisible.setValue(false);
  });
}
