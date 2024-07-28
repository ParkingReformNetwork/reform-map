import Choices from "choices.js";
import "choices.js/public/assets/styles/choices.css";

import { PlaceFilterManager } from "./FilterState";

export default function initSearch(filterManager: PlaceFilterManager): void {
  const cities = Object.keys(filterManager.entries).map((placeId) => ({
    value: placeId,
    label: placeId,
  }));
  const htmlElement = document.querySelector(".city-search");
  const choices = new Choices(htmlElement, {
    position: "bottom",
    choices: cities,
    placeholderValue: "City search",
    removeItemButton: true,
    allowHTML: false,
    itemSelectText: "Select",
  });

  // Set initial state.
  choices.setChoiceByValue(filterManager.getState().searchInput);

  htmlElement.addEventListener("change", () => {
    filterManager.update({ searchInput: choices.getValue(true) as string[] });
  });
}
