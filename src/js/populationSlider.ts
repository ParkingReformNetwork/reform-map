import { FilterPopupVisibleObservable } from "./filterPopup";
import { PlaceFilterManager, POPULATION_INTERVALS } from "./FilterState";

const THUMBSIZE = 24;
export const POPULATION_MAX_INDEX = POPULATION_INTERVALS.length - 1;

interface Sliders {
  readonly controls: HTMLDivElement;
  readonly label: HTMLDivElement;
  readonly left: HTMLInputElement;
  readonly right: HTMLInputElement;
}

function generateSliders(filterPopup: HTMLFormElement): Sliders {
  const container = document.createElement("div");
  container.className = "population-slider-container";

  const label = document.createElement("div");
  label.id = "population-slider-label";
  container.append(label);

  const controls = document.createElement("div");
  controls.className = "population-slider-controls";
  container.append(controls);

  const left = document.createElement("input");
  left.setAttribute("aria-labelledby", "population-slider-label");
  left.className = "population-slider-left";
  left.name = "min";
  left.type = "range";
  left.step = "0.5";
  left.min = "0";
  controls.append(left);

  const right = document.createElement("input");
  right.setAttribute("aria-labelledby", "population-slider-label");
  right.className = "population-slider-right";
  right.name = "max";
  right.type = "range";
  right.step = "0.5";
  right.min = "0";
  right.value = "0";
  controls.append(right);

  filterPopup.append(container);

  return {
    controls,
    label,
    left,
    right,
  };
}

function updateSlidersUI(
  populationSliderIndexes: [number, number],
  sliders: Sliders,
): void {
  const [leftIndex, rightIndex] = populationSliderIndexes;

  sliders.left.value = leftIndex.toString();
  sliders.right.value = rightIndex.toString();
  sliders.left.setAttribute("value", leftIndex.toString());
  sliders.right.setAttribute("value", rightIndex.toString());

  // We dynamically change the sliders so that they cannot extend past each other.
  const inBetween = (rightIndex - leftIndex) / 2;
  const newLeftMax = leftIndex + inBetween;
  const newRightMin = rightIndex - inBetween;
  sliders.left.setAttribute("max", newLeftMax.toString());
  sliders.right.setAttribute("min", newRightMin.toString());

  const intervalSizePx = Math.round(
    (sliders.controls.offsetWidth + THUMBSIZE / 2) /
      POPULATION_INTERVALS.length,
  );
  const leftWidth = newLeftMax * intervalSizePx;
  const rightWidth = (POPULATION_MAX_INDEX - newRightMin) * intervalSizePx;
  sliders.left.style.width = `${leftWidth + THUMBSIZE / 2}px`;
  sliders.right.style.width = `${rightWidth + THUMBSIZE / 2}px`;

  // The left slider has a fixed anchor. However, the right slider has to move
  // everytime the range of the slider changes.
  sliders.right.style.left = `${leftWidth + THUMBSIZE}px`;

  const leftLabel = POPULATION_INTERVALS[leftIndex][0];
  const rightLabel = POPULATION_INTERVALS[rightIndex][0];
  sliders.label.innerHTML = `${leftLabel} - ${rightLabel} residents`;
}

export function initPopulationSlider(
  filterManager: PlaceFilterManager,
  filterPopupIsVisible: FilterPopupVisibleObservable,
  filterPopup: HTMLFormElement,
): void {
  const sliders = generateSliders(filterPopup);

  // Set initial state.
  const maxIndex = filterManager
    .getState()
    .populationSliderIndexes[1].toString();
  sliders.left.setAttribute("max", maxIndex);
  sliders.right.setAttribute("max", maxIndex);
  sliders.right.setAttribute("value", maxIndex);

  // Add event listeners.
  const onChange = (): void => {
    const leftIndex = Math.floor(parseFloat(sliders.left.value));
    const rightIndex = Math.ceil(parseFloat(sliders.right.value));
    filterManager.update({ populationSliderIndexes: [leftIndex, rightIndex] });
  };
  sliders.left.addEventListener("input", onChange);
  sliders.right.addEventListener("input", onChange);

  // Update UI whenever filter popup is visible. Note that
  // the popup must be visible for the width calculations to work.
  filterPopupIsVisible.subscribe((isVisible) => {
    if (isVisible) {
      updateSlidersUI(
        filterManager.getState().populationSliderIndexes,
        sliders,
      );
    }
  }, "render population slider");

  // Also update UI when values change, but only if the filter popup is open.
  filterManager.subscribe("update population sliders", (state) => {
    if (!filterPopupIsVisible.getValue()) return;
    updateSlidersUI(state.populationSliderIndexes, sliders);
  });
}
