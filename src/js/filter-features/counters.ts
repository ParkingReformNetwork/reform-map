import { iconHtml } from "../layout/icons";
import type { ViewState } from "../layout/viewToggle";
import { COUNTRIES_PREFIXED_BY_THE } from "../model/data";
import { encodedPlaceToUrl } from "../model/placeId";
import {
  assertNever,
  type PlaceType,
  type PolicyType,
  type ReformStatus,
} from "../model/types";
import {
  type FilterState,
  isAllMinimumsRemovedToggleInEffect,
  type PlaceFilterManager,
  type PolicyTypeFilter,
} from "../state/FilterState";

export function determinePlaceDescription(
  numPlaces: number,
  matchedCountries: Set<string>,
  matchedPlaceTypes: Set<PlaceType>,
): string {
  let country =
    matchedCountries.size === 1
      ? Array.from(matchedCountries)[0]
      : `${matchedCountries.size} countries`;
  if (COUNTRIES_PREFIXED_BY_THE.has(country)) {
    country = `the ${country}`;
  }

  const placeTypeLabels: Record<PlaceType, [string, string]> = {
    city: ["city", "cities"],
    county: ["county", "counties"],
    state: ["state", "states"],
    country: ["country", "countries"],
  };
  const singlePlaceType =
    matchedPlaceTypes.size === 1 ? Array.from(matchedPlaceTypes)[0] : null;
  const [singular, plural] = singlePlaceType
    ? placeTypeLabels[singlePlaceType]
    : ["place", "places"];
  const label = numPlaces === 1 ? singular : plural;

  if (singlePlaceType === "country") {
    return `${numPlaces} ${label}`;
  }
  return `${numPlaces} ${label} in ${country}`;
}

export const SEARCH_RESET_HTML = `<button class="counter-search-reset" role="button" aria-label="reset search">reset search</button>`;
export const TABLE_DOWNLOAD_HTML = `<button class="counter-table-download" role="button" aria-label="download table as CSV">download as CSV</button>`;

interface PolicyTypeNouns {
  // The full noun phrase, e.g. "parking maximums", used on its own.
  full: string;
  // The shortened noun, e.g. "maximums", used as a list item alongside other policy types.
  listItem: string;
}

const POLICY_TYPE_NOUNS: Record<PolicyType, PolicyTypeNouns> = {
  "add parking maximums": {
    full: "parking maximums",
    listItem: "maximums",
  },
  "reduce parking minimums": {
    full: "parking minimum reductions",
    listItem: "minimum reductions",
  },
  "remove parking minimums": {
    full: "parking minimum removals",
    listItem: "minimum removals",
  },
  "parking benefit district": {
    full: "parking benefit districts",
    listItem: "benefit districts",
  },
};

export function determineSearch(
  view: ViewState,
  placeId: string,
  encodedPlace: string,
  policyType: PolicyTypeFilter,
  status: ReformStatus,
): string {
  const placeLink = `<a class="external-link" target="_blank" href=${encodedPlaceToUrl(
    encodedPlace,
  )}>${placeId} ${iconHtml("arrow-right")}</a>`;

  if (view === "map") {
    return `Showing ${placeLink} — ${SEARCH_RESET_HTML}`;
  }

  const suffix = `in ${placeLink} — ${SEARCH_RESET_HTML}`;

  if (policyType === "any parking reform") {
    return `Showing an overview of ${status} parking reforms ${suffix}`;
  }

  const noun = POLICY_TYPE_NOUNS[policyType];
  return `Showing details about ${status} ${noun.full} ${suffix}`;
}

export function determineAnyReform(
  view: ViewState,
  placeDescription: string,
  matchedPolicyTypes: Set<PolicyType>,
  statePolicyTypes: Set<PolicyType>,
  state: ReformStatus,
): string {
  if (view === "table") {
    return `Showing an overview of ${state} parking reforms in ${placeDescription} - ${TABLE_DOWNLOAD_HTML}`;
  }

  const prefix = `Showing ${placeDescription} with`;
  const policyDescriptions = Array.from(statePolicyTypes)
    .filter((policy) => matchedPolicyTypes.has(policy))
    .map((policy) => POLICY_TYPE_NOUNS[policy]);
  if (!policyDescriptions.length) {
    throw new Error(`Expected state.includedPolicyChanges to be set`);
  }
  if (policyDescriptions.length === 1) {
    return `${prefix} ${state} ${policyDescriptions[0].full}`;
  }

  // Else, multiple policies. Format as a list.
  const listItems = policyDescriptions
    .map((description) => `<li>${description.listItem}</li>`)
    .sort()
    .join("");
  return `${prefix} 1+ ${state} parking reforms:<ul>${listItems}</ul>`;
}

export function buildSimplePolicyText(
  view: ViewState,
  placeDescription: string,
  status: ReformStatus,
  noun: string,
): string {
  return view === "map"
    ? `Showing ${placeDescription} with ${status} ${noun}`
    : `Showing details about ${status} ${noun} for ${placeDescription} - ${TABLE_DOWNLOAD_HTML}`;
}

export function determineRmMin(
  view: ViewState,
  placeDescription: string,
  allMinimumsRemovedToggle: boolean,
  status: ReformStatus,
): string {
  // The checkbox for "all minimums removed" dramatically changes what the user sees.
  const allMinimumsInEffect = isAllMinimumsRemovedToggleInEffect({
    policyTypeFilter: "remove parking minimums",
    status,
    allMinimumsRemovedToggle,
  });
  if (view === "map") {
    const suffix = allMinimumsInEffect
      ? `all parking minimums removed`
      : `${status} parking minimum removals`;
    return `Showing ${placeDescription} with ${suffix}`;
  }

  const prefix = `Showing details about ${status} parking minimum removals for ${placeDescription}`;
  const summary = allMinimumsInEffect
    ? `${prefix} that removed all parking minimums`
    : prefix;
  return `${summary} - ${TABLE_DOWNLOAD_HTML}`;
}

export function determineHtml(
  view: ViewState,
  state: FilterState,
  manager: PlaceFilterManager,
): string {
  if (!manager.numMatchedPlaces) {
    return "No places selected — use the filter or search icons";
  }
  if (state.searchInput) {
    const placeId = state.searchInput;
    return determineSearch(
      view,
      placeId,
      manager.entries[placeId].place.encoded,
      state.policyTypeFilter,
      state.status,
    );
  }

  const placeDescription = determinePlaceDescription(
    manager.numMatchedPlaces,
    manager.matchedCountries,
    manager.matchedPlaceTypes,
  );

  switch (state.policyTypeFilter) {
    case "any parking reform":
      return determineAnyReform(
        view,
        placeDescription,
        manager.matchedPolicyTypes,
        state.includedPolicyChanges,
        state.status,
      );
    case "reduce parking minimums":
      return buildSimplePolicyText(
        view,
        placeDescription,
        state.status,
        POLICY_TYPE_NOUNS["reduce parking minimums"].full,
      );
    case "add parking maximums":
      return buildSimplePolicyText(
        view,
        placeDescription,
        state.status,
        POLICY_TYPE_NOUNS["add parking maximums"].full,
      );
    case "remove parking minimums":
      return determineRmMin(
        view,
        placeDescription,
        state.allMinimumsRemovedToggle,
        state.status,
      );
    case "parking benefit district":
      return buildSimplePolicyText(
        view,
        placeDescription,
        state.status,
        POLICY_TYPE_NOUNS["parking benefit district"].full,
      );
    default:
      return assertNever(state.policyTypeFilter);
  }
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
    mapCounter.innerHTML = determineHtml("map", state, manager);
    tableCounter.innerHTML = determineHtml("table", state, manager);
  });
}
