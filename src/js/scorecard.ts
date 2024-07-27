/* global document */

import type { FeatureGroup } from "leaflet";
import type { CityEntry, CityId } from "./types";

function initScorecard(
  markerGroup: FeatureGroup,
  data: Record<CityId, CityEntry>,
): void {
  const scorecardContainer = document.querySelector("#scorecard-container");
  if (!(scorecardContainer instanceof HTMLElement)) return;

  // Clicking a city marker opens up the scorecard.
  markerGroup.on("click", (e) => {
    const cityState = e.sourceTarget.getTooltip().getContent();
    scorecardContainer.innerHTML = generateScorecard(
      data[cityState],
      cityState,
    );
    scorecardContainer.hidden = false;
  });

  // Close window on clicks outside the scorecard.
  window.addEventListener("click", (event) => {
    if (
      event.target instanceof Node &&
      !(event.target instanceof SVGPathElement) &&
      !scorecardContainer.hidden &&
      !scorecardContainer.contains(event.target)
    ) {
      scorecardContainer.hidden = true;
    }
  });

  // The event listener is on `#scorecard-container` because it is never erased,
  // unlike the scorecard contents being recreated every time the city changes.
  // This is called "event delegation".
  scorecardContainer.addEventListener("click", async (event) => {
    const clicked = event.target;
    if (!(clicked instanceof Element)) return;
    const closeIconContainer = clicked.closest(
      ".scorecard-close-icon-container",
    );
    if (!(closeIconContainer instanceof HTMLButtonElement)) return;
    scorecardContainer.hidden = true;
  });
}

function generateScorecard(entry: CityEntry, cityState: CityId): string {
  return `
    <header class="scorecard-header">
      <h2 class="scorecard-title">${cityState}</h2>
      <button
        class="scorecard-close-icon-container"
        title="close the place details popup"
        aria-label="close the place details popup"
      >
        <i class="fa-regular fa-circle-xmark" aria-hidden="true"></i>
      </button>
    </header>
    <ul>
      <li><a class="external-link" href=${
        entry["citation_url"]
      }>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></li>
      <li>${parseInt(entry["population"]).toLocaleString()} residents</li>
    </ul>
    <p>${entry["report_summary"]}</p>
    `;
}

export default initScorecard;
