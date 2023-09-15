import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry } from "./types";

// TODO: replace with changeSelectedMarkers from ./filter.ts.
const changeSelectedMarkers = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  filterFn: (cityState: CityId) => boolean
) => {
  Object.entries(citiesToMarkers).forEach(([cityState, marker]) => {
    if (filterFn(cityState)) {
      marker.addTo(markerGroup);
    } else {
      // @ts-ignore the API allows passing a LayerGroup, but the type hint doesn't show this.
      marker.removeFrom(markerGroup);
    }
  });
};

const THUMBSIZE = 14;

// change interval by updating both stringIntervals and numInterval (slider will automatically adjust)
const STRING_INTERVALS = [
  "100",
  "500",
  "1k",
  "5k",
  "10k",
  "50k",
  "100k",
  "500k",
  "1M",
  "5M",
  "10M",
  "50M",
];
const NUM_INTERVALS = [
  100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000,
  10000000, 50000000,
];

const RANGE_MAX = STRING_INTERVALS.length - 1;

interface Sliders {
  controls: HTMLDivElement;
  left: HTMLInputElement;
  right: HTMLInputElement;
}

const draw = (sliders: Sliders, low: string, high: string): void => {
  const intervalSizePx = sliders.controls.offsetWidth / STRING_INTERVALS.length;
  const leftValue = parseInt(sliders.left.value);
  const rightValue = parseInt(sliders.right.value);

  // Setting min and max attributes for left and right sliders.
  const cross = rightValue - 0.5 >= leftValue ? rightValue - 0.5 : rightValue; // a single interval that min and max sliders overlap
  const extend = leftValue + 1 == rightValue; // (boolean): if sliders are close and within 1 step can overlap
  sliders.left.setAttribute(
    "max",
    extend ? (cross + 0.5).toString() : cross.toString()
  );
  sliders.right.setAttribute("min", cross.toString());

  // Setting CSS.
  // To prevent the two sliders from crossing, this sets the max and min for the left and right sliders respectively.
  const leftWidth =
    parseFloat(sliders.left.getAttribute("max")) * intervalSizePx;
  const rightWidth =
    (RANGE_MAX - parseFloat(sliders.right.getAttribute("min"))) *
    intervalSizePx;
  // Note: cannot set maxWidth to (rangewidth - minWidth) due to the overlaping interval
  sliders.left.style.width = leftWidth + THUMBSIZE + "px";
  sliders.right.style.width = rightWidth + THUMBSIZE + "px";

  // The left slider has a fixed anchor. However the right slider has to move everytime the range of the slider changes.
  const offset = 5;
  sliders.left.style.left = offset + "px";
  sliders.right.style.left = extend
    ? parseInt(sliders.left.style.width) -
      intervalSizePx / 2 -
      THUMBSIZE +
      offset +
      "px"
    : parseInt(sliders.left.style.width) - THUMBSIZE + offset + "px";

  const updateLabel = (cls: string, val: string): void => {
    document.querySelector(cls).innerHTML = val;
  };
  updateLabel(".population-slider-label-min", low);
  updateLabel(".population-slider-label-max", high);
};

const updateExponential = (
  sliders: Sliders,
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  // Set variables.
  const leftValue = Math.floor(parseFloat(sliders.left.value)).toString();
  const rightValue = Math.floor(parseFloat(sliders.right.value)).toString();

  sliders.left.value = leftValue;
  sliders.right.value = rightValue;

  changeSelectedMarkers(markerGroup, citiesToMarkers, (cityState) => {
    const population = parseInt(data[cityState]["population"]);
    return (
      population >= NUM_INTERVALS[leftValue] &&
      population <= NUM_INTERVALS[rightValue]
    );
  });

  draw(sliders, STRING_INTERVALS[leftValue], STRING_INTERVALS[rightValue]);
};

const setUpSlider = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  const sliders = {
    controls: document.querySelector(
      ".population-slider-controls"
    ) as HTMLDivElement,
    left: document.querySelector(".population-slider-left") as HTMLInputElement,
    right: document.querySelector(
      ".population-slider-right"
    ) as HTMLInputElement,
  };

  const rangeMax = (STRING_INTERVALS.length - 1).toString();
  sliders.left.setAttribute("max", rangeMax);
  sliders.right.setAttribute("max", rangeMax);
  sliders.right.setAttribute("data-value", rangeMax);
  sliders.controls.setAttribute("data-rangemax", rangeMax);

  sliders.controls.setAttribute(
    "data-rangewidth",
    sliders.controls.offsetWidth.toString()
  );

  const legend = document.querySelector(".population-slider-legend");
  STRING_INTERVALS.forEach((val) => {
    const span = document.createElement("span");
    span.appendChild(document.createTextNode(val));
    legend.appendChild(span);
  });

  draw(sliders, "100", "50M");

  sliders.left.addEventListener("input", (): void => {
    updateExponential(sliders, markerGroup, citiesToMarkers, data);
  });
  sliders.right.addEventListener("input", (): void => {
    updateExponential(sliders, markerGroup, citiesToMarkers, data);
  });
};

export default setUpSlider;
