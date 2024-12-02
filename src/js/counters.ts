import { FilterState, PlaceFilterManager } from "./FilterState";

export function determineHtml(
  view: "table" | "map",
  state: FilterState,
  numPlaces: number,
  numPolicyRecords: number,
  matchedCountries: Set<string>,
): string {
  if (!numPlaces) {
    return "No places selected — use the filter and search icons";
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

  const prefix = `Showing ${numPlaces} ${placesWord} in ${country}`;

  if (
    state.policyTypeFilter === "any parking reform" ||
    state.policyTypeFilter === "legacy reform"
  ) {
    const suffix = state.allMinimumsRemovedToggle
      ? "with all parking minimums removed"
      : "with parking reforms";
    return `${prefix} ${suffix}`;
  }

  if (state.policyTypeFilter === "reduce parking minimums") {
    const firstSentence = `${prefix} with parking minimum reductions`;
    return showRecords
      ? `${firstSentence}. Matched ${numPolicyRecords} total policy ${recordsWord} ${multipleRecordsExplanation}.`
      : firstSentence;
  }

  if (state.policyTypeFilter === "add parking maximums") {
    let firstSentenceSuffix;
    let secondSentence;
    if (state.allMinimumsRemovedToggle) {
      firstSentenceSuffix =
        "with both all parking minimums removed and parking maximums added";
      secondSentence = `Matched ${numPolicyRecords} total parking maximum policy ${recordsWord} ${multipleRecordsExplanation}`;
    } else {
      firstSentenceSuffix = "with parking maximums added";
      secondSentence = `Matched ${numPolicyRecords} total policy ${recordsWord} ${multipleRecordsExplanation}`;
    }
    const firstSentence = `${prefix} ${firstSentenceSuffix}`;
    return showRecords ? `${firstSentence}. ${secondSentence}.` : firstSentence;
  }

  if (state.policyTypeFilter === "remove parking minimums") {
    // It's not necessary to say the # of policy records when allMinimumsRemovedToggle is true because the place should have
    // only one removal policy record that is citywide & all land uses.
    if (state.allMinimumsRemovedToggle) {
      return `${prefix} with all parking minimums removed`;
    }

    const firstSentence = `${prefix} with parking minimum removals`;
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

  manager.subscribe((state) => {
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
