import { POPULATION_INTERVALS, changeSelectedMarkers } from "./filter";
import { PopulationSliders } from "./types";
import type Choices from "choices.js";
import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry } from "./types";

const THUMBSIZE = 14;
const RANGE_MAX = POPULATION_INTERVALS.length - 1;

const draw = (
  sliders: PopulationSliders,
  leftIndex: number,
  rightIndex: number
): void => {
  // We dynamically change the sliders so that they cannot extend past each other.
  const inBetween = (rightIndex - leftIndex) / 2;
  const newLeftMax = leftIndex + inBetween;
  const newRightMin = rightIndex - inBetween;

  sliders.left.setAttribute("max", newLeftMax.toString());
  sliders.right.setAttribute("min", newRightMin.toString());
  sliders.left.setAttribute("value", leftIndex.toString());
  sliders.right.setAttribute("value", rightIndex.toString());

  const intervalSizePx = Math.round(
    (sliders.controls.offsetWidth + THUMBSIZE / 2) / POPULATION_INTERVALS.length
  );
  const leftWidth = newLeftMax * intervalSizePx;
  const rightWidth = (RANGE_MAX - newRightMin) * intervalSizePx;
  sliders.left.style.width = `${leftWidth + THUMBSIZE / 2}px`;
  sliders.right.style.width = `${rightWidth + THUMBSIZE / 2}px`;

  // The left slider has a fixed anchor. However, the right slider has to move
  // everytime the range of the slider changes.
  sliders.right.style.left = `${leftWidth + THUMBSIZE}px`;

  const updateLabel = (cls: string, index: number): void => {
    document.querySelector(cls).innerHTML = POPULATION_INTERVALS[index][0];
  };
  updateLabel(".population-slider-label-min", leftIndex);
  updateLabel(".population-slider-label-max", rightIndex);
};

const createPopulationSlider = (): PopulationSliders => {
  const sliders = new PopulationSliders(
    document.querySelector(".population-slider-controls"),
    document.querySelector(".population-slider-left"),
    document.querySelector(".population-slider-right")
  );

  sliders.left.setAttribute("max", RANGE_MAX.toString());
  sliders.right.setAttribute("max", RANGE_MAX.toString());

  const legend = document.querySelector(".population-slider-legend");
  POPULATION_INTERVALS.forEach(([intervalText]) => {
    const span = document.createElement("span");
    span.appendChild(document.createTextNode(intervalText));
    legend.appendChild(span);
  });

  return sliders;
};

const setUpPopulationSlider = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>,
  searchElement: Choices,
  sliders: PopulationSliders
): void => {
  draw(sliders, 0, RANGE_MAX);
  const onChange = (): void => {
    const [leftIndex, rightIndex] = sliders.getCurrentIndexes();
    sliders.left.value = leftIndex.toString();
    sliders.right.value = rightIndex.toString();
    draw(sliders, leftIndex, rightIndex);
    changeSelectedMarkers(
      markerGroup,
      citiesToMarkers,
      data,
      searchElement,
      sliders
    );
  };

  sliders.left.addEventListener("input", onChange);
  sliders.right.addEventListener("input", onChange);
};

export { createPopulationSlider, setUpPopulationSlider };
