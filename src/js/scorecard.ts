import type { FeatureGroup } from "leaflet";

import type { PlaceEntry, PlaceId } from "./types";
import Observable from "./Observable";

function generateScorecard(entry: PlaceEntry, cityState: PlaceId): string {
  const dateOfReform = entry.date_of_reform
    ? `<li>Reformed on ${entry.date_of_reform}</li>`
    : "";
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
      <li><a class="external-link" target="_blank" href=${
        entry["citation_url"]
      }>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></li>
      ${dateOfReform}
      <li>${parseInt(entry["population"]).toLocaleString()} residents</li>
    </ul>
    <p>${entry["report_summary"]}</p>
    `;
}

type ScorecardState =
  | { type: "hidden" }
  | { type: "visible"; entry: PlaceEntry; placeId: PlaceId };

function updateScorecardUI(state: ScorecardState): void {
  const scorecardContainer = document.querySelector<HTMLElement>(
    "#scorecard-container",
  );
  if (!scorecardContainer) return;

  switch (state.type) {
    case "hidden": {
      scorecardContainer.hidden = true;
      break;
    }
    case "visible": {
      scorecardContainer.innerHTML = generateScorecard(
        state.entry,
        state.placeId,
      );
      scorecardContainer.hidden = false;
      break;
    }
  }
}

export default function initScorecard(
  markerGroup: FeatureGroup,
  data: Record<PlaceId, PlaceEntry>,
): void {
  const scorecardState = new Observable<ScorecardState>({ type: "hidden" });
  scorecardState.subscribe(updateScorecardUI);

  const scorecardContainer = document.querySelector("#scorecard-container");

  // Clicking a city marker opens up the scorecard.
  markerGroup.on("click", (e) => {
    const cityState = e.sourceTarget.getTooltip().getContent();
    scorecardState.setValue({
      type: "visible",
      placeId: cityState,
      entry: data[cityState],
    });
  });

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (
      scorecardState.getValue().type === "visible" &&
      event.target instanceof Element &&
      // Clicks on map dots should not trigger this event.
      !(event.target instanceof SVGPathElement) &&
      !scorecardContainer?.contains(event.target)
    ) {
      scorecardState.setValue({ type: "hidden" });
    }
  });

  // The event listener is on `#scorecard-container` because it is never erased,
  // unlike the scorecard contents being recreated every time the city changes.
  // This is called "event delegation".
  scorecardContainer?.addEventListener("click", (event) => {
    const clicked = event.target;
    if (!(clicked instanceof Element)) return;
    const closeIcon = clicked.closest<HTMLElement>(
      ".scorecard-close-icon-container",
    );
    if (!closeIcon) return;
    scorecardState.setValue({ type: "hidden" });
  });

  scorecardState.initialize();
}
