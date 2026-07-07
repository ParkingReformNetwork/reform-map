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

  // Two full-width range inputs are stacked directly on top of each other. CSS
  // makes only their thumbs interactive (the tracks are inert), so each thumb
  // can be dragged independently over the shared track drawn behind them.
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

  // The thumbs must stay at least one interval apart: an equal-value range like
  // "100 - 100 residents" is meaningless. When the dragged thumb reaches its
  // neighbor, snap it back by one so the two can never cross or coincide.
  const onThumbDrag = (dragged: "left" | "right"): void => {
    let leftIndex = parseInt(sliders.left.value, 10);
    let rightIndex = parseInt(sliders.right.value, 10);
    if (dragged === "left") {
      leftIndex = Math.min(leftIndex, rightIndex - 1);
      sliders.left.value = leftIndex.toString();
    } else {
      rightIndex = Math.max(rightIndex, leftIndex + 1);
      sliders.right.value = rightIndex.toString();
    }
    filterManager.update({ populationSliderIndexes: [leftIndex, rightIndex] });
  };
  sliders.left.addEventListener("input", () => onThumbDrag("left"));
  sliders.right.addEventListener("input", () => onThumbDrag("right"));

  // Keep the UI in sync with state. This fires on every filter change, so skip
  // the work unless the population indexes actually changed.
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
