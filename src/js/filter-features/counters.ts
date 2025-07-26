import { isEqual } from "lodash-es";

import {
  FilterState,
  isAllMinimumsRemovedToggleInEffect,
  PlaceFilterManager,
  PolicyTypeFilter,
} from "../state/FilterState";
import { PlaceId, PlaceType, PolicyType, ReformStatus } from "../model/types";
import { placeIdToUrl, COUNTRIES_PREFIXED_BY_THE } from "../model/data";
import type { ViewState } from "../layout/viewToggle";

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

  if (isEqual(matchedPlaceTypes, new Set(["city"]))) {
    const label = numPlaces === 1 ? "city" : "cities";
    return `${numPlaces} ${label} in ${country}`;
  }
  if (isEqual(matchedPlaceTypes, new Set(["county"]))) {
    const label = numPlaces === 1 ? "county" : "counties";
    return `${numPlaces} ${label} in ${country}`;
  }
  if (isEqual(matchedPlaceTypes, new Set(["state"]))) {
    const label = numPlaces === 1 ? "state" : "states";
    return `${numPlaces} ${label} in ${country}`;
  }
  if (isEqual(matchedPlaceTypes, new Set(["country"]))) {
    return numPlaces === 1 ? "1 country" : `${numPlaces} countries`;
  }
  const label = numPlaces === 1 ? "place" : "places";
  return `${numPlaces} ${label} in ${country}`;
}

export const SEARCH_RESET_HTML = `<a class="counter-search-reset" role="button" aria-label="reset search">reset search</a>`;

export function determineSearch(
  view: ViewState,
  placeId: PlaceId,
  policyType: PolicyTypeFilter,
  status: ReformStatus,
): string {
  const placeLink = `<a class="external-link" target="_blank" href=${placeIdToUrl(
    placeId,
  )}>${placeId} <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>`;

  if (view === "map") {
    return `Showing ${placeLink} — ${SEARCH_RESET_HTML}`;
  }

  const suffix = `in ${placeLink} — ${SEARCH_RESET_HTML}`;
  switch (policyType) {
    case "any parking reform":
      return `Showing an overview of ${status} parking reforms ${suffix}`;
    case "add parking maximums":
      return `Showing details about ${status} parking maximums ${suffix}`;
    case "reduce parking minimums":
      return `Showing details about ${status} parking minimum reductions ${suffix}`;
    case "remove parking minimums":
      return `Showing details about ${status} parking minimum removals ${suffix}`;
    default:
      throw new Error(`Unexpected policy type: ${policyType}`);
  }
}

export function determineAnyReform(
  view: ViewState,
  placeDescription: string,
  matchedPolicyTypes: Set<PolicyType>,
  statePolicyTypes: Set<string>,
  state: ReformStatus,
): string {
  if (view === "table") {
    return `Showing an overview of ${state} parking reforms in ${placeDescription}`;
  }

  interface Description {
    singlePolicy: string;
    multiplePolicies: string;
  }

  const prefix = `Showing ${placeDescription} with`;
  const policyDescriptionMap: Record<PolicyType, Description> = {
    "add parking maximums": {
      singlePolicy: "parking maximums",
      multiplePolicies: "maximums",
    },
    "reduce parking minimums": {
      singlePolicy: "parking minimum reductions",
      multiplePolicies: "minimum reductions",
    },
    "remove parking minimums": {
      singlePolicy: "parking minimum removals",
      multiplePolicies: "minimum removals",
    },
  };
  const policyDescriptions = Array.from(statePolicyTypes)
    .filter((policy) => matchedPolicyTypes.has(policy as PolicyType))
    .map((policy) => policyDescriptionMap[policy as PolicyType]);
  if (!policyDescriptions.length) {
    throw new Error(`Expected state.includedPolicyChanges to be set`);
  }
  if (policyDescriptions.length === 1) {
    return `${prefix} ${state} ${policyDescriptions[0].singlePolicy}`;
  }

  // Else, multiple policies. Format as a list.
  const listItems = policyDescriptions
    .map((description) => `<li>${description.multiplePolicies}</li>`)
    .sort()
    .join("");
  return `${prefix} 1+ ${state} parking reforms:<ul>${listItems}</ul>`;
}

export function determineReduceMin(
  view: ViewState,
  placeDescription: string,
  status: ReformStatus,
): string {
  return view === "map"
    ? `Showing ${placeDescription} with ${status} parking minimum reductions`
    : `Showing details about ${status} parking minimum reductions for ${placeDescription}`;
}

export function determineAddMax(
  view: ViewState,
  placeDescription: string,
  status: ReformStatus,
): string {
  return view === "map"
    ? `Showing ${placeDescription} with ${status} parking maximums`
    : `Showing details about ${status} parking maximums for ${placeDescription}`;
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
  return allMinimumsInEffect
    ? `${prefix} that removed all parking minimums`
    : prefix;
}

export function determineHtml(
  view: ViewState,
  state: FilterState,
  numPlaces: number,
  matchedPolicyTypes: Set<PolicyType>,
  matchedCountries: Set<string>,
  matchedPlaceTypes: Set<PlaceType>,
): string {
  if (!numPlaces) {
    return "No places selected — use the filter or search icons";
  }
  if (state.searchInput) {
    return determineSearch(
      view,
      state.searchInput,
      state.policyTypeFilter,
      state.status,
    );
  }

  const placeDescription = determinePlaceDescription(
    numPlaces,
    matchedCountries,
    matchedPlaceTypes,
  );

  switch (state.policyTypeFilter) {
    case "any parking reform":
      return determineAnyReform(
        view,
        placeDescription,
        matchedPolicyTypes,
        state.includedPolicyChanges,
        state.status,
      );
    case "reduce parking minimums":
      return determineReduceMin(view, placeDescription, state.status);
    case "add parking maximums":
      return determineAddMax(view, placeDescription, state.status);
    case "remove parking minimums":
      return determineRmMin(
        view,
        placeDescription,
        state.allMinimumsRemovedToggle,
        state.status,
      );
    default:
      throw new Error(`Unexpected policy type: ${state.policyTypeFilter}`);
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
    mapCounter.innerHTML = determineHtml(
      "map",
      state,
      manager.placeIds.size,
      manager.matchedPolicyTypes,
      manager.matchedCountries,
      manager.matchedPlaceTypes,
    );
    tableCounter.innerHTML = determineHtml(
      "table",
      state,
      manager.placeIds.size,
      manager.matchedPolicyTypes,
      manager.matchedCountries,
      manager.matchedPlaceTypes,
    );
  });
}
