var thumbsize = 14;

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

function draw(slider, low, high) {
  // set vars from top to bottom
  var lower = slider.querySelector(".lower");
  var upper = slider.querySelector(".upper");
  var min = slider.querySelector(".left-slider"); // left slider
  var max = slider.querySelector(".right-slider"); // right slider
  var legend = slider.querySelector(".legend"); // number below sliders
  var thumbsize = parseInt(slider.getAttribute("data-thumbsize"));
  var rangewidth = parseInt(slider.getAttribute("data-rangewidth"));
  var rangemin = parseInt(slider.getAttribute("data-rangemin"));    // total min
  var rangemax = parseInt(slider.getAttribute("data-rangemax"));    // total max
  var intervalSize = rangewidth / (rangemax - rangemin + 1);        // how far the slider moves for each interval (px)
  var minValue = parseInt(min.value);
  var maxValue = parseInt(max.value);

  // set min and max attributes for left and right sliders
  // cross: a single interval that min and max sliders overlap

  var cross = maxValue - 0.5 >= minValue ? maxValue - 0.5 : maxValue;
  console.log("cross: " +cross+ "\nmaxValue: " +maxValue+ "\nminValue: " +minValue)
  // extend (boolean): if sliders are close and within 1 step can overlap
  var extend = minValue + 1 == maxValue;
  min.setAttribute("max", extend ? cross + 0.5 : cross);
  max.setAttribute("min", cross);

  /* set css */
  // To prevent the two sliders from crossing, this sets the max and min for the left and right sliders respectively.
  minWidth = min.getAttribute("max") * intervalSize;
  maxWidth = (rangemax - max.getAttribute("min")) * intervalSize;
  // Note: cannot set maxWidth to rangewidth - minWidth due to the overlaping interval
  min.style.width = minWidth + thumbsize + "px";
  max.style.width = maxWidth + thumbsize + "px";

  // The left slider has a fixed anchor. However the right slider has to move everytime the range of the slider changes.
  min.style.left = "0px";
  max.style.left = extend
    ? parseInt(min.style.width) - intervalSize/2 - thumbsize + "px"
    : parseInt(min.style.width) - thumbsize + "px";
  min.style.top = lower.offsetHeight + "px";
  max.style.top = lower.offsetHeight + "px";
  legend.style.marginTop = min.offsetHeight + "px";
  slider.style.height =
    lower.offsetHeight + min.offsetHeight + legend.offsetHeight + "px";

  /* write value and labels */
//   max.value = max.getAttribute("data-value");
//   min.value = min.getAttribute("data-value");
  lower.innerHTML = low;
  upper.innerHTML = high;
}

function init(slider) {
  /* set function vars */
  var min = slider.querySelector(".left-slider");
  var max = slider.querySelector(".right-slider");
  var rangemin = parseInt(min.getAttribute("min"));
  var rangemax = parseInt(max.getAttribute("max"));
  var avgvalue = (rangemin + rangemax) / 2;
  var legendnum = slider.getAttribute("data-legendnum");

  /* set data-values */
//   min.setAttribute("data-value", rangemin);
//   max.setAttribute("data-value", rangemax);

  /* set data vars */
  slider.setAttribute("data-rangemin", rangemin);
  slider.setAttribute("data-rangemax", rangemax);
  slider.setAttribute("data-thumbsize", thumbsize);
  slider.setAttribute("data-rangewidth", slider.offsetWidth);

  /* write labels */
  var lower = document.createElement("span");
  var upper = document.createElement("span");
  lower.classList.add("lower", "value");
  upper.classList.add("upper", "value");
  lower.appendChild(document.createTextNode(rangemin));
  upper.appendChild(document.createTextNode(rangemax));
  slider.insertBefore(lower, min.previousElementSibling);
  slider.insertBefore(upper, min.previousElementSibling);

  /* write legend */
  var legend = document.createElement("div");
  legend.classList.add("legend");
  var legendvalues = [];
  for (var i = 0; i < legendnum; i++) {
    legendvalues[i] = document.createElement("div");
    var val = stringIntervals[i];
    legendvalues[i].appendChild(document.createTextNode(val));
    legend.appendChild(legendvalues[i]);
  }
  slider.appendChild(legend);

  /* draw */
  draw(slider, "100", "50M");

  /* events */
  min.addEventListener("input", function () {
    updateExponential(min);
  });
  max.addEventListener("input", function () {
    updateExponential(max);
  });
}

function updateExponential(el) {
  // Define the intervals in an array
  const intervals = [
    100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000,
    10000000, 50000000,
  ];
  /* set function vars */
  var slider = el.parentElement;
  var min = slider.querySelector("#left-slider");
  var max = slider.querySelector("#right-slider");
  var minvalue = Math.floor(min.value);
  var maxvalue = Math.floor(max.value);

  /* set inactive values before draw */
//   min.setAttribute("data-value", minvalue);
//   max.setAttribute("data-value", maxvalue);
  min.value = minvalue;
  max.value = maxvalue;

  var avgvalue = (minvalue + maxvalue) / 2;
  /* draw */
  draw(slider, stringIntervals[minvalue], stringIntervals[maxvalue]);
}

var sliders = document.querySelectorAll(".min-max-slider");
sliders.forEach(function (slider) {
  init(slider);
});
