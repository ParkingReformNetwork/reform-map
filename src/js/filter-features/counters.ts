import { isEqual } from "lodash-es";

import {
  FilterState,
  PlaceFilterManager,
  PolicyTypeFilter,
} from "../state/FilterState";
import { PlaceId, PlaceType, PolicyType } from "../model/types";
import { joinWithConjunction, placeIdToUrl } from "../model/data";
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
  if (country === "United States" || country === "United Kingdom") {
    country = `the ${country}`;
  }

  if (isEqual(matchedPlaceTypes, new Set(["city"]))) {
    const label = numPlaces === 1 ? "city" : "cities";
    return `${numPlaces} ${label} in ${country}`;
  } else if (isEqual(matchedPlaceTypes, new Set(["county"]))) {
    const label = numPlaces === 1 ? "county" : "counties";
    return `${numPlaces} ${label} in ${country}`;
  } else if (isEqual(matchedPlaceTypes, new Set(["state"]))) {
    const label = numPlaces === 1 ? "state" : "states";
    return `${numPlaces} ${label} in ${country}`;
  } else if (isEqual(matchedPlaceTypes, new Set(["country"]))) {
    return numPlaces === 1 ? "1 country" : `${numPlaces} countries`;
  } else {
    const label = numPlaces === 1 ? "place" : "places";
    return `${numPlaces} ${label} in ${country}`;
  }
}

export const SEARCH_RESET_HTML = `<a class="counter-search-reset" role="button" aria-label="reset search">reset search</a>`;

export function determineSearch(
  view: ViewState,
  placeId: PlaceId,
  policyType: PolicyTypeFilter,
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
      return `Showing an overview of adopted parking reforms ${suffix}`;
    case "add parking maximums":
      return `Showing details about parking maximums ${suffix}`;
    case "reduce parking minimums":
      return `Showing details about parking minimum reductions ${suffix}`;
    case "remove parking minimums":
      return `Showing details about parking minimum removals ${suffix}`;
  }
}

export function determineAnyReform(
  view: ViewState,
  placeDescription: string,
  matchedPolicyTypes: Set<PolicyType>,
  allMinimumsRemovedToggle: boolean,
  statePolicyTypes: Set<string>,
): string {
  if (view === "table") {
    const prefix = `Showing an overview of adopted parking reforms in ${placeDescription}`;
    const suffix = allMinimumsRemovedToggle
      ? " with all parking minimums removed"
      : "";
    return `${prefix}${suffix}`;
  }

  const prefix = `Showing ${placeDescription} with`;

  if (allMinimumsRemovedToggle) {
    const suffix = isEqual(statePolicyTypes, new Set(["add parking maximums"]))
      ? "both all parking minimums removed and parking maximums added"
      : "all parking minimums removed";
    return `${prefix} ${suffix}`;
  }

  const policyDescriptionMap: Record<PolicyType, string> = {
    "add parking maximums": "parking maximums added",
    "reduce parking minimums": "parking minimums reduced",
    "remove parking minimums": "parking minimums removed",
  };
  const policyDescriptions = Array.from(statePolicyTypes)
    .filter((policy) => matchedPolicyTypes.has(policy as PolicyType))
    .map((policy) => policyDescriptionMap[policy as PolicyType])
    .sort()
    .reverse();
  if (!policyDescriptions.length) {
    throw new Error(`Expected state.includedPolicyChanges to be set`);
  }
  const suffix = joinWithConjunction(policyDescriptions, "or");
  return `${prefix} ${suffix}`;
}

export function determineReduceMin(
  view: ViewState,
  placeDescription: string,
): string {
  return view === "map"
    ? `Showing ${placeDescription} with parking minimums reduced`
    : `Showing details about parking minimum reductions for ${placeDescription}`;
}

export function determineAddMax(
  view: ViewState,
  placeDescription: string,
  allMinimumsRemovedToggle: boolean,
): string {
  if (view === "map") {
    const suffix = allMinimumsRemovedToggle
      ? "both all parking minimums removed and parking maximums added"
      : "parking maximums added";
    return `Showing ${placeDescription} with ${suffix}`;
  }
  const prefix = `Showing details about parking maximums for ${placeDescription}`;
  return allMinimumsRemovedToggle
    ? `${prefix} that have also removed all parking minimums`
    : prefix;
}

export function determineRmMin(
  view: ViewState,
  placeDescription: string,
  allMinimumsRemovedToggle: boolean,
): string {
  if (view === "map") {
    const suffix = allMinimumsRemovedToggle
      ? `all parking minimums removed`
      : `parking minimums removed`;
    return `Showing ${placeDescription} with ${suffix}`;
  }
  const prefix = `Showing details about parking minimum removals for ${placeDescription}`;
  return allMinimumsRemovedToggle
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
    return determineSearch(view, state.searchInput, state.policyTypeFilter);
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
        state.allMinimumsRemovedToggle,
        state.includedPolicyChanges,
      );
    case "reduce parking minimums":
      return determineReduceMin(view, placeDescription);
    case "add parking maximums":
      return determineAddMax(
        view,
        placeDescription,
        state.allMinimumsRemovedToggle,
      );
    case "remove parking minimums":
      return determineRmMin(
        view,
        placeDescription,
        state.allMinimumsRemovedToggle,
      );
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
