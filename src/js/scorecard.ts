import type { FeatureGroup } from "leaflet";
import { capitalize } from "lodash-es";

import type { ProcessedCoreEntry, PlaceId } from "./types";
import Observable from "./Observable";
import { PlaceFilterManager } from "./FilterState";
import { ViewStateObservable } from "./viewToggle";
import { determinePolicyTypes } from "./data";

function generateScorecardLegacy(
  entry: ProcessedCoreEntry,
  placeId: PlaceId,
): string {
  const dateOfReform = entry.unifiedPolicy.date
    ? `<li>Reformed ${entry.unifiedPolicy.date.preposition()} ${entry.unifiedPolicy.date.format()}</li>`
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
        entry.place.url
      }>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a></li>
      ${dateOfReform}
      <li>${entry.place.pop.toLocaleString()} residents</li>
    </ul>
    <p>${entry.unifiedPolicy.summary}</p>
    `;
}

function generateScorecardRevamp(
  entry: ProcessedCoreEntry,
  placeId: PlaceId,
): string {
  const policies = determinePolicyTypes(entry, { onlyAdopted: false })
    .map((type) => `<li>${capitalize(type)}</li>`)
    .join("");
  const policyTypesHtml = `<div>Reform types:</div><ul>${policies}</ul>`;

  const allMinimumsRemoved = entry.place.repeal
    ? "<li>All parking minimums removed</li>"
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
      <li>${entry.place.pop.toLocaleString()} residents</li>
      ${allMinimumsRemoved}
    </ul>
    ${policyTypesHtml}
    <a class="external-link" target="_blank" href=${
      entry.place.url
    }>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>
    `;
}

type ScorecardState =
  | { type: "hidden" }
  | {
      type: "visible";
      entry: ProcessedCoreEntry;
      placeId: PlaceId;
    };

function updateScorecardUI(
  revampEnabled: boolean,
  state: ScorecardState,
): void {
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
      scorecardContainer.innerHTML = revampEnabled
        ? generateScorecardRevamp(state.entry, state.placeId)
        : generateScorecardLegacy(state.entry, state.placeId);
      scorecardContainer.hidden = false;
      break;
    }
  }
}

export default function initScorecard(
  filterManager: PlaceFilterManager,
  viewToggle: ViewStateObservable,
  markerGroup: FeatureGroup,
  data: Record<PlaceId, ProcessedCoreEntry>,
  options: { revampEnabled: boolean },
): void {
  const scorecardState = new Observable<ScorecardState>("scorecard", {
    type: "hidden",
  });
  scorecardState.subscribe((state) =>
    updateScorecardUI(options.revampEnabled, state),
  );

  const scorecardContainer = document.querySelector("#scorecard-container");
  const header = document.querySelector(".top-header");

  // Clicking a city marker opens up the scorecard.
  markerGroup.on("click", (e) => {
    const placeId = e.sourceTarget.getTooltip().getContent();
    scorecardState.setValue({
      type: "visible",
      placeId,
      entry: data[placeId],
    });
  });

  // Searching for a city opens up the scorecard if in map view.
  filterManager.subscribe("open scorecard on search", (state) => {
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
    // Don't run this code when initializing the scorecardState observable.
    if (!scorecardState.isInitialized) return;

    if (type === "hidden") {
      filterManager.update({ searchInput: null });
    }
  }, "reset search FilterState when scorecard closed");

  scorecardState.initialize();
}
