import type { FeatureGroup } from "leaflet";

import type { PlaceEntry, PlaceId } from "./types";
import Observable from "./Observable";
import { PlaceFilterManager } from "./FilterState";
import { ViewStateObservable } from "./viewToggle";

function generateScorecard(entry: PlaceEntry, placeId: PlaceId): string {
  const dateOfReform = entry.reformDate
    ? `<li>Reformed on ${entry.reformDate}</li>`
    : "";
  return `
    <header class="scorecard-header">
      <h2 class="scorecard-title">${placeId}</h2>
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
        entry["url"]
      }>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></li>
      ${dateOfReform}
      <li>${entry["population"].toLocaleString()} residents</li>
    </ul>
    <p>${entry["summary"]}</p>
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
  filterManager: PlaceFilterManager,
  viewToggle: ViewStateObservable,
  markerGroup: FeatureGroup,
  data: Record<PlaceId, PlaceEntry>,
): void {
  const scorecardState = new Observable<ScorecardState>({ type: "hidden" });
  scorecardState.subscribe(updateScorecardUI);

  const scorecardContainer = document.querySelector("#scorecard-container");
  const header = document.querySelector(".top-header");

  // Clicking a city marker opens up the scorecard.
  markerGroup.on("click", (e) => {
    const cityState = e.sourceTarget.getTooltip().getContent();
    scorecardState.setValue({
      type: "visible",
      placeId: cityState,
      entry: data[cityState],
    });
  });

  // Searching for a city opens up the scorecard if in map view.
  filterManager.subscribe((state) => {
    const search = state.searchInput;
    if (search && viewToggle.getValue() === "map") {
      scorecardState.setValue({
        type: "visible",
        placeId: search,
        entry: data[search],
      });
    }
  });

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (
      scorecardState.getValue().type === "visible" &&
      event.target instanceof Element &&
      // Clicks on map dots should not trigger this event.
      !(event.target instanceof SVGPathElement) &&
      // Clicks on the header also should not trigger the event.
      !header?.contains(event.target) &&
      !scorecardContainer?.contains(event.target)
    ) {
      scorecardState.setValue({ type: "hidden" });
    }
  });

  // The scorecard close button closes the popup.
  //
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

  // Closing the scorecard resets search.
  scorecardState.subscribe(({ type }) => {
    if (type === "hidden") filterManager.update({ searchInput: null });
  });

  scorecardState.initialize();
}
