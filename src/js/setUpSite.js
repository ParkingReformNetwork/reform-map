import { Map, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";

import setUpIcons from "./fontAwesome";

import "bootstrap";

/**
 * Set up leaflet map
 */
const base = new TileLayer(
  "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}",
  {
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abcd",
    minZoom: 0,
    maxZoom: 20,
    ext: "png",
  }
);

/**
 * Set up event listeners to open and close the about popup.
 */
const setUpAbout = () => {
  const aboutElement = document.querySelector(".about-text-popup");
  const infoButton = document.querySelector("#about-btn");

  infoButton.addEventListener("click", () => {
    aboutElement.style.display =
      aboutElement.style.display !== "block" ? "block" : "none";
  });

  // closes window on clicks outside the info popup
  window.addEventListener("click", function (event) {
    console.log(event.target);
    if (
      !infoButton.contains(event.target) &&
      aboutElement.style.display == "block" &&
      !aboutElement.contains(event.target)
    ) {
      aboutElement.style.display = "none";
      infoButton.classList.toggle("active");
    }
  });

  // Note that the close element will only render when the about text popup is rendered.
  // So, it only ever makes sense for a click to close.
  document.querySelector(".about-close").addEventListener("click", () => {
    aboutElement.style.display = "none";
    infoButton.classList.toggle("active");
  });
};

const setUpSite = async () => {
  setUpIcons();

  setUpAbout();

  const map = new Map("map", {
    layers: [base],
  });
  map.setView([40.9437, -78.9709], 12); // latitude, longitude

  map.attributionControl.setPrefix(
    'created by <a style="padding: 0 3px 0 3px; color:#fafafa; background-color: #21ccb9;" href=http://www.geocadder.bg/en/>GEOCADDER</a>'
  );
};

export default setUpSite;
