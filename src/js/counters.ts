import { FilterState, PlaceFilterManager } from "./FilterState";

export function determineHtml(
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

  const prefix = `Showing ${numPlaces} ${placesWord} in ${country}`;

  if (
    state.policyTypeFilter === "any parking reform" ||
    state.policyTypeFilter === "legacy reform"
  ) {
    const suffix = state.allMinimumsRemovedToggle
      ? "with all parking minimums removed."
      : "with parking reforms.";
    return `${prefix} ${suffix}`;
  }

  if (state.policyTypeFilter === "reduce parking minimums") {
    return `${prefix} with parking minimum reductions. Matched ${numPolicyRecords} total policy ${recordsWord}.`;
  }

  if (state.policyTypeFilter === "add parking maximums") {
    const suffix = state.allMinimumsRemovedToggle
      ? `with both all parking minimums removed and parking maximums added. Matched ${numPolicyRecords} total parking maximum policy ${recordsWord}.`
      : `with parking maximums added. Matched ${numPolicyRecords} total policy ${recordsWord}.`;
    return `${prefix} ${suffix}`;
  }

  if (state.policyTypeFilter === "remove parking minimums") {
    const suffix = state.allMinimumsRemovedToggle
      ? // It's not necessary to say the # of policy records when allMinimumsRemovedToggle is true because the place should have
        // only one removal policy record that is citywide & all land uses.
        `with all parking minimums removed.`
      : `with parking minimum removals. Matched ${numPolicyRecords} total policy ${recordsWord}.`;
    return `${prefix} ${suffix}`;
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
    const html = determineHtml(
      state,
      manager.placeIds.size,
      manager.numMatchedPolicyRecords,
      manager.matchedCountries,
    );
    mapCounter.innerHTML = html;
    tableCounter.innerHTML = html;
  });
}
