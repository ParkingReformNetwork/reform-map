import type { FeatureGroup } from "leaflet";
import { capitalize } from "lodash-es";
import { iconHtml } from "../layout/icons";
import type { ViewStateObservable } from "../layout/viewToggle";
import { determinePolicyTypeStatuses } from "../model/data";
import { determinesupplementalPlaceInfo } from "../model/placeId";
import type { PlaceId, ProcessedCoreEntry } from "../model/types";
import type { PlaceFilterManager } from "../state/FilterState";
import Observable from "../state/Observable";
import type { MarkerWithPlaceId } from "./markers";

export function generateScorecard(entry: ProcessedCoreEntry): string {
  const supplementalPlace = determinesupplementalPlaceInfo(entry.place);
  const titleContents = supplementalPlace
    ? `${entry.place.name}<br/><span class="scorecard-supplemental-place-info">${supplementalPlace}</span>`
    : entry.place.name;

  const policyToStatuses = determinePolicyTypeStatuses(entry);
  // If at least one policy record is proposed or repealed, we mention
  // the ReformStatus with every policy type so that people don't incorrectly
  // think a record was adopted when it wasn't.
  const needsStatusLabels = Object.values(policyToStatuses).some(
    (statuses) => statuses.has("proposed") || statuses.has("repealed"),
  );

  const policies = Object.entries(policyToStatuses)
    .filter(([, statuses]) => statuses.size)
    .map(([policyType, statusesSet]) => {
      let suffix = "";
      if (needsStatusLabels) {
        const statuses = new Intl.ListFormat("en").format(
          Array.from(statusesSet).sort(),
        );
        suffix = ` (${statuses})`;
      }
      const val = capitalize(`${policyType}${suffix}`);
      return `<li>${val}</li>`;
    })
    .join("");
  const policyTypesHtml = `<div>Reform types:</div><ul>${policies}</ul>`;

  const allMinimumsRemoved = entry.place.repeal
    ? "<li>All parking minimums removed</li>"
    : "";

  return `
    <header class="scorecard-header">
      <h2 class="scorecard-title">${titleContents}</h2>
      <button
        class="scorecard-close-icon-container"
        title="close the place details popup"
        aria-label="close the place details popup"
      >
        ${iconHtml("circle-xmark")}
      </button>
    </header>
    <ul>
      <li>${entry.place.pop.toLocaleString()} residents</li>
      ${allMinimumsRemoved}
    </ul>
    ${policyTypesHtml}
    <a class="external-link" target="_blank" href=${
      entry.place.url
    }>Details and citations ${iconHtml("arrow-right")}</a>
    `;
}

type ScorecardState =
  | { type: "hidden" }
  | {
      type: "visible";
      entry: ProcessedCoreEntry;
      placeId: PlaceId;
    };

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
      scorecardContainer.innerHTML = generateScorecard(state.entry);
      scorecardContainer.hidden = false;
      break;
    }
    default:
      throw new Error(`Unexpected state.type: ${state}`);
  }
}

export default function initScorecard(
  filterManager: PlaceFilterManager,
  viewToggle: ViewStateObservable,
  markerGroup: FeatureGroup,
  data: Record<PlaceId, ProcessedCoreEntry>,
): void {
  const scorecardState = new Observable<ScorecardState>("scorecard", {
    type: "hidden",
  });
  scorecardState.subscribe((state) => updateScorecardUI(state));

  const scorecardContainer = document.querySelector("#scorecard-container");
  const header = document.querySelector(".top-header");

  // We use this variable to keep track of when a marker was clicked so that
  // our event listener on `window` clicks to close out the scorecard
  // can differentiate when we clicked on a marker vs something else.
  let markerJustClicked = false;

  // Clicking a city marker opens up the scorecard.
  markerGroup.on("click", (e) => {
    markerJustClicked = true;
    const { placeId } = e.sourceTarget as MarkerWithPlaceId;
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

  // Clicks outside the scorecard popup close it.
  window.addEventListener("click", (event) => {
    // A click on a map dot opens the scorecard; don't let it immediately close it.
    if (markerJustClicked) {
      markerJustClicked = false;
      return;
    }
    if (
      scorecardState.getValue().type === "visible" &&
      event.target instanceof Element &&
      // Clicks on the header and scorecard should not close the scorecard.
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
