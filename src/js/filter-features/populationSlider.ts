import {
  type AccordionState,
  generateAccordion,
  wireAccordion,
} from "../layout/accordion";
import {
  type PlaceFilterManager,
  POPULATION_INTERVALS,
} from "../state/FilterState";
import type Observable from "../state/Observable";

export const POPULATION_MAX_INDEX = POPULATION_INTERVALS.length - 1;

interface Sliders {
  readonly label: HTMLDivElement;
  readonly fill: HTMLDivElement;
  readonly left: HTMLInputElement;
  readonly right: HTMLInputElement;
}

function determinePopulationRangeTitle(
  populationSliderIndexes: [number, number],
): string {
  const [leftIndex, rightIndex] = populationSliderIndexes;
  const leftLabel = POPULATION_INTERVALS[leftIndex][0];
  const rightLabel = POPULATION_INTERVALS[rightIndex][0];
  return ` (${leftLabel}-${rightLabel})`;
}

function generateSliders(
  initialPopulationSliderIndexes: [number, number],
  optionsContainer: HTMLDivElement,
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

  // A static background track with a highlighted "fill" spanning the selected
  // range. The fill is positioned by updateSlidersUI.
  const track = document.createElement("div");
  track.className = "population-slider-track";
  controls.append(track);

  const fill = document.createElement("div");
  fill.className = "population-slider-fill";
  controls.append(fill);

  // Both inputs span the full width and share the same min/max. They overlap;
  // CSS makes only their thumbs interactive so each thumb can be dragged
  // independently. This avoids resizing the inputs, which is what made the old
  // implementation brittle and caused the thumbs to nudge each other.
  const maxIndex = POPULATION_MAX_INDEX.toString();

  const left = document.createElement("input");
  left.setAttribute("aria-labelledby", "population-slider-label");
  left.className = "population-slider-left";
  left.name = "min";
  left.type = "range";
  left.step = "1";
  left.min = "0";
  left.max = maxIndex;
  left.value = initialPopulationSliderIndexes[0].toString();
  controls.append(left);

  const right = document.createElement("input");
  right.setAttribute("aria-labelledby", "population-slider-label");
  right.className = "population-slider-right";
  right.name = "max";
  right.type = "range";
  right.step = "1";
  right.min = "0";
  right.max = maxIndex;
  right.value = initialPopulationSliderIndexes[1].toString();
  controls.append(right);

  const accordionState = wireAccordion(
    accordionElements,
    "filter accordion population",
    {
      hidden: false,
      expanded: false,
      title: "Population",
      supplementalTitle: determinePopulationRangeTitle(
        initialPopulationSliderIndexes,
      ),
    },
  );

  accordionElements.contentContainer.append(container);
  optionsContainer.append(accordionElements.outerContainer);

  return [
    {
      label,
      fill,
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

  // Position the highlighted fill between the two thumbs.
  const leftPercent = (leftIndex / POPULATION_MAX_INDEX) * 100;
  const rightPercent = (rightIndex / POPULATION_MAX_INDEX) * 100;
  sliders.fill.style.left = `${leftPercent}%`;
  sliders.fill.style.width = `${rightPercent - leftPercent}%`;

  const leftLabel = POPULATION_INTERVALS[leftIndex][0];
  const rightLabel = POPULATION_INTERVALS[rightIndex][0];
  sliders.label.textContent = `${leftLabel} - ${rightLabel} residents`;
}

export function initPopulationSlider(
  filterManager: PlaceFilterManager,
  optionsContainer: HTMLDivElement,
): void {
  const { populationSliderIndexes } = filterManager.getState();
  const [sliders, accordionStateObservable] = generateSliders(
    populationSliderIndexes,
    optionsContainer,
  );

  // Add event listeners. The thumbs share a track, so we constrain each to keep
  // the min strictly below the max: a range like "100 - 100" is meaningless. We
  // correct the dragged input's value immediately so the thumb never visually
  // overshoots the other.
  const onLeftInput = (): void => {
    const rightIndex = parseInt(sliders.right.value, 10);
    const leftIndex = Math.min(
      parseInt(sliders.left.value, 10),
      rightIndex - 1,
    );
    sliders.left.value = leftIndex.toString();
    filterManager.update({ populationSliderIndexes: [leftIndex, rightIndex] });
  };
  const onRightInput = (): void => {
    const leftIndex = parseInt(sliders.left.value, 10);
    const rightIndex = Math.max(
      parseInt(sliders.right.value, 10),
      leftIndex + 1,
    );
    sliders.right.value = rightIndex.toString();
    filterManager.update({ populationSliderIndexes: [leftIndex, rightIndex] });
  };
  sliders.left.addEventListener("input", onLeftInput);
  sliders.right.addEventListener("input", onRightInput);

  // Keep the UI in sync with state. Unlike the old implementation, this no
  // longer depends on the slider being visible, so there is no render-on-expand
  // dance. We still guard on the population indexes since this fires for every
  // filter change.
  let priorPopulationSliderIndexes = populationSliderIndexes;
  filterManager.subscribe("update population sliders", (state) => {
    const [priorLeft, priorRight] = priorPopulationSliderIndexes;
    const [newLeft, newRight] = state.populationSliderIndexes;
    if (priorLeft === newLeft && priorRight === newRight) return;
    priorPopulationSliderIndexes = state.populationSliderIndexes;

    accordionStateObservable.setValue({
      ...accordionStateObservable.getValue(),
      supplementalTitle: determinePopulationRangeTitle(
        state.populationSliderIndexes,
      ),
    });
    updateSlidersUI(state.populationSliderIndexes, sliders);
  });

  updateSlidersUI(populationSliderIndexes, sliders);
  accordionStateObservable.initialize();
}
