import { changeSelectedMarkers } from "./filter";

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

const draw = (slider, low, high) => {
  // Setting vars from top to bottom.
  var lower = document.querySelector(".lower");
  var upper = document.querySelector(".upper");
  var leftSlider = slider.querySelector(".left-slider"); // left slider
  var rightSlider = slider.querySelector(".right-slider"); // right slider
  var rangewidth = parseInt(slider.getAttribute("data-rangewidth"));
  var rangemin = parseInt(slider.getAttribute("data-rangemin")); // total min
  var rangemax = parseInt(slider.getAttribute("data-rangemax")); // total max
  var intervalSize = rangewidth / (rangemax - rangemin + 1); // how far the slider moves for each interval (px)
  var leftValue = parseInt(leftSlider.value);
  var rightValue = parseInt(rightSlider.value);

  // Setting min and max attributes for left and right sliders.
  var cross = rightValue - 0.5 >= leftValue ? rightValue - 0.5 : rightValue; // a single interval that min and max sliders overlap
  var extend = leftValue + 1 == rightValue; // (boolean): if sliders are close and within 1 step can overlap
  leftSlider.setAttribute("max", extend ? cross + 0.5 : cross);
  rightSlider.setAttribute("min", cross);

  // Setting CSS.
  // To prevent the two sliders from crossing, this sets the max and min for the left and right sliders respectively.
  leftWidth = leftSlider.getAttribute("max") * intervalSize;
  rightWidth = (rangemax - rightSlider.getAttribute("min")) * intervalSize;
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

const init = (slider, markerGroup, citiesToMarkers, data) => {
  // Setting variables.
  var leftSlider = slider.querySelector(".left-slider");
  var rightSlider = slider.querySelector(".right-slider");
  var rangemin = parseInt(leftSlider.getAttribute("min"));
  var rangemax = parseInt(rightSlider.getAttribute("max"));
  var legendnum = slider.getAttribute("data-legendnum");

  // Setting data attributes
  leftSlider.setAttribute("data-value", rangemin);
  rightSlider.setAttribute("data-value", rangemax);
  slider.setAttribute("data-rangemin", rangemin);
  slider.setAttribute("data-rangemax", rangemax);
  slider.setAttribute("data-thumbsize", thumbsize);
  slider.setAttribute("data-rangewidth", slider.offsetWidth);

  // Writing and inserting header label
  var lower = document.querySelector(".lower");
  var upper = document.querySelector(".upper");
  //   lower.classList.add("lower", "value");
  //   upper.classList.add("upper", "value");
  lower.appendChild(document.createTextNode(rangemin));
  upper.appendChild(document.createTextNode(rangemax));
  //   slider.insertBefore(lower, leftSlider.previousElementSibling);
  //   slider.insertBefore(upper, leftSlider.previousElementSibling);

  // Writing and inserting interval legend
  var legend = document.querySelector(".slider-legend");
  var legendvalues = [];
  for (var i = 0; i < legendnum; i++) {
    legendvalues[i] = document.createElement("span");
    var val = stringIntervals[i];
    legendvalues[i].appendChild(document.createTextNode(val));
    legend.appendChild(legendvalues[i]);
  }

  draw(slider, "100", "50M");

  leftSlider.addEventListener("input", function () {
    updateExponential(leftSlider, markerGroup, citiesToMarkers, data);
  });
  rightSlider.addEventListener("input", function () {
    updateExponential(rightSlider, markerGroup, citiesToMarkers, data);
  });
};

const updateExponential = (el, markerGroup, citiesToMarkers, data) => {
  // Set variables.
  var slider = el.parentElement;
  var leftSlider = slider.querySelector("#left-slider");
  var rightSlider = slider.querySelector("#right-slider");
  var leftValue = Math.floor(leftSlider.value);
  var rightValue = Math.floor(rightSlider.value);

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
  var sliders = document.querySelectorAll(".min-max-slider");
  sliders.forEach((slider) => {
    init(slider, markerGroup, citiesToMarkers, data);
  });
};

export default setUpSlider;
