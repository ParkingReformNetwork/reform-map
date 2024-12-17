import { isEqual } from "lodash-es";

import { FilterState, PlaceFilterManager } from "./FilterState";
import { PolicyType } from "./types";

export function determineHtml(
  view: "table" | "map",
  state: FilterState,
  numPlaces: number,
  numPolicyRecords: number,
  matchedCountries: Set<string>,
): string {
  if (!numPlaces) {
    return "No places selected — use the filter or search icons";
  }
  if (state.searchInput) {
    return `Showing ${state.searchInput} from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>`;
  }

  let country =
    matchedCountries.size === 1
      ? Array.from(matchedCountries)[0]
      : `${matchedCountries.size} countries`;
  if (country === "United States" || country === "United Kingdom") {
    country = `the ${country}`;
  }

  const placesWord = numPlaces === 1 ? "place" : "places";
  const recordsWord = numPolicyRecords === 1 ? "record" : "records";

  // We only show the number of policy records when it's useful information to the user
  // because it would otherwise be noisy.
  const showRecords = view === "table" && numPlaces !== numPolicyRecords;
  const multipleRecordsExplanation =
    "because some places have multiple records";

  const prefix = `Showing ${numPlaces} ${placesWord} in ${country} with`;

  if (state.policyTypeFilter === "legacy reform") {
    const suffix = state.allMinimumsRemovedToggle
      ? "all parking minimums removed"
      : "parking reforms";
    return `${prefix} ${suffix}`;
  }

  if (state.policyTypeFilter === "any parking reform") {
    // We customize the text based on which policy changes are selected.
    let suffix;
    if (state.allMinimumsRemovedToggle) {
      suffix = isEqual(
        state.includedPolicyChanges,
        new Set(["add parking maximums"]),
      )
        ? "both all parking minimums removed and parking maximums added"
        : "all parking minimums removed";
    } else {
      const policyDescriptionMap: Record<PolicyType, string> = {
        "add parking maximums": "parking maximums added",
        "reduce parking minimums": "parking minimums reduced",
        "remove parking minimums": "parking minimums removed",
      };
      const policyDescriptions = Array.from(state.includedPolicyChanges)
        .map((policy) => policyDescriptionMap[policy as PolicyType])
        .sort()
        .reverse();
      if (!policyDescriptions.length) {
        throw new Error(
          `Expected state.includedPolicyChanges to be set: ${JSON.stringify(state)}`,
        );
      }
      if (policyDescriptions.length <= 2) {
        suffix = policyDescriptions.join(" or ");
      } else {
        const lastTerm = policyDescriptions.pop();
        suffix = `${policyDescriptions.join(", ")}, or ${lastTerm}`;
      }
    }
    return `${prefix} ${suffix}`;
  }

  if (state.policyTypeFilter === "reduce parking minimums") {
    const firstSentence = `${prefix} parking minimums reduced`;
    return showRecords
      ? `${firstSentence}. Matched ${numPolicyRecords} total policy ${recordsWord} ${multipleRecordsExplanation}.`
      : firstSentence;
  }

  if (state.policyTypeFilter === "add parking maximums") {
    let firstSentenceSuffix;
    let secondSentence;
    if (state.allMinimumsRemovedToggle) {
      firstSentenceSuffix =
        "both all parking minimums removed and parking maximums added";
      secondSentence = `Matched ${numPolicyRecords} total parking maximum policy ${recordsWord} ${multipleRecordsExplanation}`;
    } else {
      firstSentenceSuffix = "parking maximums added";
      secondSentence = `Matched ${numPolicyRecords} total policy ${recordsWord} ${multipleRecordsExplanation}`;
    }
    const firstSentence = `${prefix} ${firstSentenceSuffix}`;
    return showRecords ? `${firstSentence}. ${secondSentence}.` : firstSentence;
  }

  if (state.policyTypeFilter === "remove parking minimums") {
    // It's not necessary to say the # of policy records when allMinimumsRemovedToggle is true because the place should have
    // only one removal policy record that is citywide & all land uses.
    if (state.allMinimumsRemovedToggle) {
      return `${prefix} all parking minimums removed`;
    }

    const firstSentence = `${prefix} parking minimums removed`;
    return showRecords
      ? `${firstSentence}. Matched ${numPolicyRecords} total policy ${recordsWord} ${multipleRecordsExplanation}.`
      : firstSentence;
  }

  throw new Error("unreachable");
}

function setUpResetButton(
  counterContainer: HTMLElement,
  manager: PlaceFilterManager,
): void {
  counterContainer.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.matches(".counter-search-reset")
    ) {
      manager.update({ searchInput: null });
    }
  });
}

export default function initCounters(manager: PlaceFilterManager): void {
  const mapCounter = document.getElementById("map-counter");
  const tableCounter = document.getElementById("table-counter");
  if (!mapCounter || !tableCounter) return;

  setUpResetButton(mapCounter, manager);
  setUpResetButton(tableCounter, manager);

  manager.subscribe("update counters", (state) => {
    mapCounter.innerHTML = determineHtml(
      "map",
      state,
      manager.placeIds.size,
      manager.numMatchedPolicyRecords,
      manager.matchedCountries,
    );
    tableCounter.innerHTML = determineHtml(
      "table",
      state,
      manager.placeIds.size,
      manager.numMatchedPolicyRecords,
      manager.matchedCountries,
    );
  });
}
