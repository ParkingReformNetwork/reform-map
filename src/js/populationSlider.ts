import { changeSelectedMarkers } from "./filter";
import type { CircleMarker, FeatureGroup } from "leaflet";
import type { CityId, CityEntry } from "./types";

const thumbsize = 14;
const stringIntervals = [
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

const numInterval = [
  100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000,
  10000000, 50000000,
];

const draw = (slider: HTMLInputElement, low: string, high: string): void => {
  // Setting vars from top to bottom.
  const lower = document.querySelector(".lower");
  const upper = document.querySelector(".upper");
  const leftSlider = slider.querySelector(".left-slider") as HTMLInputElement;
  const rightSlider = slider.querySelector(".right-slider") as HTMLInputElement;
  const rangewidth = parseInt(slider.getAttribute("data-rangewidth"));
  const rangemin = parseInt(slider.getAttribute("data-rangemin")); // total min
  const rangemax = parseInt(slider.getAttribute("data-rangemax")); // total max
  const intervalSize = rangewidth / (rangemax - rangemin + 1); // how far the slider moves for each interval (px)
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
  leftSlider.style.width = leftWidth + thumbsize + "px";
  rightSlider.style.width = rightWidth + thumbsize + "px";

  // The left slider has a fixed anchor. However the right slider has to move everytime the range of the slider changes.
  const offset = 5;
  leftSlider.style.left = offset + "px";
  rightSlider.style.left = extend
    ? parseInt(leftSlider.style.width) -
      intervalSize / 2 -
      thumbsize +
      offset +
      "px"
    : parseInt(leftSlider.style.width) - thumbsize + offset + "px";

  // There is a separate attribute "data-value" to ensure the slider resets when page is refreshed.
  rightSlider.value = rightSlider.getAttribute("data-value");
  leftSlider.value = leftSlider.getAttribute("data-value");
  lower.innerHTML = low;
  upper.innerHTML = high;
};

const init = (
  slider: HTMLInputElement,
  markerGroup: FeatureGroup,
  citiesToMarkers: Record<CityId, CircleMarker>,
  data: Record<CityId, CityEntry>
): void => {
  // Setting variables.
  const leftSlider = slider.querySelector(".left-slider") as HTMLInputElement;
  const rightSlider = slider.querySelector(".right-slider") as HTMLInputElement;
  const rangemin = parseInt(leftSlider.getAttribute("min"));
  const rangemax = parseInt(rightSlider.getAttribute("max"));
  const legendnum = slider.getAttribute("data-legendnum");

  // Setting data attributes
  leftSlider.setAttribute("data-value", rangemin.toString());
  rightSlider.setAttribute("data-value", rangemax.toString());
  slider.setAttribute("data-rangemin", rangemin.toString());
  slider.setAttribute("data-rangemax", rangemax.toString());
  slider.setAttribute("data-thumbsize", thumbsize.toString());
  slider.setAttribute("data-rangewidth", slider.offsetWidth.toString());

  // Writing and inserting header label
  const lower = document.querySelector(".lower");
  const upper = document.querySelector(".upper");
  lower.appendChild(document.createTextNode(rangemin.toString()));
  upper.appendChild(document.createTextNode(rangemax.toString()));

  // Writing and inserting interval legend
  const legend = document.querySelector(".slider-legend");
  const legendvalues = [];
  for (let i = 0; i < parseInt(legendnum); i++) {
    legendvalues[i] = document.createElement("span");
    const val = stringIntervals[i];
    legendvalues[i].appendChild(document.createTextNode(val));
    legend.appendChild(legendvalues[i]);
  }

  draw(slider, "100", "50M");

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
) => {
  // Set variables.
  const slider = el.parentElement as HTMLInputElement;
  const leftSlider = slider.querySelector("#left-slider") as HTMLInputElement;
  const rightSlider = slider.querySelector("#right-slider") as HTMLInputElement;
  const leftValue = Math.floor(parseFloat(leftSlider.value)).toString();
  const rightValue = Math.floor(parseFloat(rightSlider.value)).toString();

  // Set attributes before drawing
  leftSlider.setAttribute("data-value", leftValue);
  rightSlider.setAttribute("data-value", rightValue);
  leftSlider.value = leftValue;
  rightSlider.value = rightValue;

  const min = numInterval[leftValue];
  const max = numInterval[rightValue];

  const inBetween = (x, low, high) => {
    return x >= low && x <= high;
  };

  changeSelectedMarkers(markerGroup, citiesToMarkers, (cityState) =>
    inBetween(parseInt(data[cityState]["population"]), min, max)
  );

  draw(slider, stringIntervals[leftValue], stringIntervals[rightValue]);
};

const setUpSlider = (markerGroup, citiesToMarkers, data) => {
  const sliders = document.querySelectorAll(".population-slider");
  sliders.forEach((slider: HTMLInputElement) => {
    init(slider, markerGroup, citiesToMarkers, data);
  });
};

export default setUpSlider;
