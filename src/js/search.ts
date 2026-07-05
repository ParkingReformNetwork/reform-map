import Choices from "choices.js";
import { initTogglePopup } from "./layout/popup";
import type { PlaceFilterManager } from "./state/FilterState";

export default function initSearch(filterManager: PlaceFilterManager): void {
  const htmlElement = document.querySelector(".search");
  if (!htmlElement) return;

  // Building Choices.js with the full set of places is expensive (~90ms), so
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
    choices.setChoiceByValue(filterManager.getState().searchInput ?? "");
  };

  const popupIsVisible = initTogglePopup({
    id: "search popup",
    popupSelector: "#search-popup",
    iconSelector: ".header-search-icon-container",
    onOpen: () => {
      // Build the Choices.js widget before focusing it, since `div.choices`
      // does not exist until then.
      buildChoices();
      setTimeout(
        () => document.querySelector<HTMLElement>("div.choices")?.click(),
        100,
      );
    },
  });

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
