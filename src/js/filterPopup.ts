import { updateSlidersUI } from "./populationSlider";
import Observable from "./Observable";
import { PlaceFilterManager } from "./FilterState";

function updateFilterPopupUI(isVisible: boolean): void {
  const popup = document.querySelector<HTMLElement>(".filter-popup");
  const icon = document.querySelector(".header-filter-icon-container");
  if (!popup || !icon) return;
  popup.hidden = !isVisible;
  icon.ariaExpanded = isVisible.toString();
}

export default function initFilterPopup(filterManager: PlaceFilterManager) {
  const isVisible = new Observable<boolean>(false);
  isVisible.subscribe(updateFilterPopupUI);

  // We redraw the population slider on the first load because it requires the popup
  // to be displayed to compute offsetWidth.
  let hasInitedPopulation = false;
  isVisible.subscribe((visible) => {
    if (!hasInitedPopulation && visible) {
      updateSlidersUI(filterManager.getState());
      hasInitedPopulation = true;
    }
  });

  const popup = document.querySelector(".filter-popup");
  const icon = document.querySelector(".header-filter-icon-container");

  icon.addEventListener("click", () => {
    isVisible.setValue(!isVisible.getValue());
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
