import {
  AccordionState,
  generateAccordion,
  updateAccordionUI,
} from "./filterOptions";
import { PlaceFilterManager, POPULATION_INTERVALS } from "./FilterState";
import Observable from "./Observable";

const THUMBSIZE = 24;
export const POPULATION_MAX_INDEX = POPULATION_INTERVALS.length - 1;

interface Sliders {
  readonly controls: HTMLDivElement;
  readonly label: HTMLDivElement;
  readonly left: HTMLInputElement;
  readonly right: HTMLInputElement;
}

function determineAccordionDescription(
  populationSliderIndexes: [number, number],
): string {
  const [leftIndex, rightIndex] = populationSliderIndexes;
  const leftLabel = POPULATION_INTERVALS[leftIndex][0];
  const rightLabel = POPULATION_INTERVALS[rightIndex][0];
  return ` (${leftLabel}-${rightLabel})`;
}

function generateSliders(
  initialPopulationSliderIndexes: [number, number],
  filterPopup: HTMLFormElement,
): [Sliders, Observable<AccordionState>] {
  const accordionElements = generateAccordion("population-slider");

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
  left.value = "0";
  controls.append(left);

  const right = document.createElement("input");
  right.setAttribute("aria-labelledby", "population-slider-label");
  right.className = "population-slider-right";
  right.name = "max";
  right.type = "range";
  right.step = "0.5";
  right.min = "0";
  controls.append(right);

  // const populationSliderIndexes = filterMa
  const accordionState = new Observable<AccordionState>(
    `filter accordion population`,
    {
      hidden: false,
      expanded: false,
      supplementalTitle: determineAccordionDescription(
        initialPopulationSliderIndexes,
      ),
    },
  );
  accordionState.subscribe((state) =>
    updateAccordionUI(accordionElements, "Population", state),
  );
  accordionElements.accordionButton.addEventListener("click", () => {
    const priorState = accordionState.getValue();
    accordionState.setValue({
      ...priorState,
      expanded: !priorState.expanded,
    });
  });

  accordionElements.contentContainer.append(container);
  filterPopup.append(accordionElements.outerContainer);

  return [
    {
      controls,
      label,
      left,
      right,
    },
    accordionState,
  ];
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
  filterPopup: HTMLFormElement,
): void {
  const populationSliderIndexes =
    filterManager.getState().populationSliderIndexes;
  const [sliders, accordionStateObservable] = generateSliders(
    populationSliderIndexes,
    filterPopup,
  );

  // Set initial state.
  const maxIndex = populationSliderIndexes[1].toString();
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

  // Update UI whenever accordion is expanded. Note that the accordion
  // must be visible for the width calculations to work.
  accordionStateObservable.subscribe(({ hidden }) => {
    if (!hidden) {
      updateSlidersUI(
        filterManager.getState().populationSliderIndexes,
        sliders,
      );
    }
  }, "render population slider");

  // Also update UI when values change
  filterManager.subscribe("update population sliders", (state) => {
    const accordionPriorState = accordionStateObservable.getValue();
    accordionStateObservable.setValue({
      ...accordionPriorState,
      supplementalTitle: determineAccordionDescription(
        state.populationSliderIndexes,
      ),
    });

    if (!accordionStateObservable.getValue().hidden) {
      updateSlidersUI(state.populationSliderIndexes, sliders);
    }
  });

  accordionStateObservable.initialize();
}
