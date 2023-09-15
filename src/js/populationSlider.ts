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

// Corresponds to setting `min="0"` on the two `input` elements.
const RANGE_MIN = 0;

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

const draw = (
  sliderControls: HTMLDivElement,
  low: string,
  high: string
): void => {
  const leftSlider = document.querySelector(
    ".population-slider-left"
  ) as HTMLInputElement;
  const rightSlider = document.querySelector(
    ".population-slider-right"
  ) as HTMLInputElement;
  const rangewidth = parseInt(sliderControls.getAttribute("data-rangewidth"));
  const rangemax = parseInt(sliderControls.getAttribute("data-rangemax")); // total max
  const intervalSize = rangewidth / (rangemax - RANGE_MIN + 1); // how far the slider moves for each interval (px)
  const leftValue = parseInt(leftSlider.value);
  const rightValue = parseInt(rightSlider.value);

  // Setting min and max attributes for left and right sliders.
  const cross = rightValue - 0.5 >= leftValue ? rightValue - 0.5 : rightValue; // a single interval that min and max sliders overlap
  const extend = leftValue + 1 == rightValue; // (boolean): if sliders are close and within 1 step can overlap
  leftSlider.setAttribute(
    "max",
    extend ? (cross + 0.5).toString() : cross.toString()
  );
  rightSlider.setAttribute("min", cross.toString());

  // Setting CSS.
  // To prevent the two sliders from crossing, this sets the max and min for the left and right sliders respectively.
  const leftWidth = parseFloat(leftSlider.getAttribute("max")) * intervalSize;
  const rightWidth =
    (rangemax - parseFloat(rightSlider.getAttribute("min"))) * intervalSize;
  // Note: cannot set maxWidth to (rangewidth - minWidth) due to the overlaping interval
  leftSlider.style.width = leftWidth + THUMBSIZE + "px";
  rightSlider.style.width = rightWidth + THUMBSIZE + "px";

  // The left slider has a fixed anchor. However the right slider has to move everytime the range of the slider changes.
  const offset = 5;
  leftSlider.style.left = offset + "px";
  rightSlider.style.left = extend
    ? parseInt(leftSlider.style.width) -
      intervalSize / 2 -
      THUMBSIZE +
      offset +
      "px"
    : parseInt(leftSlider.style.width) - THUMBSIZE + offset + "px";

  // There is a separate attribute "data-value" to ensure the slider resets when page is refreshed.
  rightSlider.value = rightSlider.getAttribute("data-value");
  leftSlider.value = leftSlider.getAttribute("data-value");

  const updateLabel = (cls: string, val: string): void => {
    document.querySelector(cls).innerHTML = val;
  };
  updateLabel(".population-slider-label-min", low);
  updateLabel(".population-slider-label-max", high);
};

const init = (
  sliderControls: HTMLDivElement,
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  const leftSlider = document.querySelector(
    ".population-slider-left"
  ) as HTMLInputElement;
  const rightSlider = document.querySelector(
    ".population-slider-right"
  ) as HTMLInputElement;

  const rangeMax = (STRING_INTERVALS.length - 1).toString();
  leftSlider.setAttribute("max", rangeMax);
  rightSlider.setAttribute("max", rangeMax);
  rightSlider.setAttribute("data-value", rangeMax);
  sliderControls.setAttribute("data-rangemax", rangeMax);

  sliderControls.setAttribute(
    "data-rangewidth",
    sliderControls.offsetWidth.toString()
  );

  const legend = document.querySelector(".population-slider-legend");
  STRING_INTERVALS.forEach((val) => {
    const span = document.createElement("span");
    span.appendChild(document.createTextNode(val));
    legend.appendChild(span);
  });

  draw(sliderControls, "100", "50M");

  leftSlider.addEventListener("input", (): void => {
    updateExponential(leftSlider, markerGroup, citiesToMarkers, data);
  });
  rightSlider.addEventListener("input", (): void => {
    updateExponential(rightSlider, markerGroup, citiesToMarkers, data);
  });
};

const updateExponential = (
  el: HTMLInputElement,
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  // Set variables.
  const slider = el.parentElement as HTMLInputElement;
  const leftSlider = slider.querySelector(
    ".population-slider-left"
  ) as HTMLInputElement;
  const rightSlider = slider.querySelector(
    ".population-slider-right"
  ) as HTMLInputElement;
  const leftValue = Math.floor(parseFloat(leftSlider.value)).toString();
  const rightValue = Math.floor(parseFloat(rightSlider.value)).toString();

  // Set attributes before drawing.
  leftSlider.setAttribute("data-value", leftValue);
  rightSlider.setAttribute("data-value", rightValue);
  leftSlider.value = leftValue;
  rightSlider.value = rightValue;

  changeSelectedMarkers(markerGroup, citiesToMarkers, (cityState) => {
    const population = parseInt(data[cityState]["population"]);
    return (
      population >= NUM_INTERVALS[leftValue] &&
      population <= NUM_INTERVALS[rightValue]
    );
  });

  draw(slider, STRING_INTERVALS[leftValue], STRING_INTERVALS[rightValue]);
};

// Finds a specified div and initializes the two sliders that creates the double headed slider.
const setUpSlider = (
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  const sliderControls = document.querySelector(
    ".population-slider-controls"
  ) as HTMLDivElement;
  init(sliderControls, markerGroup, citiesToMarkers, data);
};

export default setUpSlider;
